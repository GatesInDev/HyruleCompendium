"""
Hyrule Compendium — Deep Data Scraper v3
=========================================
Extracts the richest possible data from the Zelda Fandom Wiki for
every entry, including lore, height, age, species, gender, weaknesses,
damage, HP, and multiple lore paragraphs. BotW/TotK use the structured
Hyrule Compendium API; all other games use the MediaWiki API.

Usage:
    python scraper.py               # all games → MongoDB
    python scraper.py --dry-run     # JSON output only
    python scraper.py --game "Ocarina of Time"
    python scraper.py --category monsters
    python scraper.py --clear       # wipe collection first
"""

import argparse
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.collection import Collection

# ──────────────────────────────────────────────────────────────────────────────
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB  = os.getenv("MONGODB_DB", "hyrule_compendium")
COLLECTION  = "compendiumentries"

WIKI_API    = "https://zelda.fandom.com/api.php"
CRAWL_DELAY = 1.5

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "HyruleCompendiumBot/3.0 (educational project)",
    "Accept-Language": "en-US,en;q=0.9",
}

GAMES = [
    "The Legend of Zelda", "Zelda II: The Adventure of Link",
    "A Link to the Past", "Link's Awakening", "Ocarina of Time",
    "Majora's Mask", "Oracle of Ages", "Oracle of Seasons",
    "The Wind Waker", "Four Swords Adventures", "The Minish Cap",
    "Twilight Princess", "Phantom Hourglass", "Spirit Tracks",
    "Skyward Sword", "A Link Between Worlds", "Tri Force Heroes",
    "Breath of the Wild", "Tears of the Kingdom",
]

CATEGORIES = ["creatures", "equipment", "materials", "monsters", "treasure"]

HYRULE_API_BOTW = "https://botw-compendium.herokuapp.com/api/v3/compendium/all"
HYRULE_API_TOTK = "https://botw-compendium.herokuapp.com/api/v3/compendium/all?game=totk"


# ──────────────────────────────────────────────────────────────────────────────
# Schema
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class CompendiumEntry:
    id: int
    name: str
    category: str
    description: str       # first paragraph (intro)
    lore: str              # additional lore/background paragraphs
    image: str
    game: str
    # Physical / lore
    species: str           = ""
    gender: str            = ""
    age: str               = ""
    height: str            = ""
    habitat: str           = ""
    # References
    common_locations: list[str]   = field(default_factory=list)
    drops: list[str]              = field(default_factory=list)
    obtaining_methods: list[str]  = field(default_factory=list)
    appearances: list[str]        = field(default_factory=list)
    related_items: list[str]      = field(default_factory=list)
    # Combat
    weaknesses: list[str]         = field(default_factory=list)
    cooking_effect: str           = ""
    hearts_recovered: Optional[float] = None
    properties: dict              = field(default_factory=dict)

    def to_dict(self) -> dict:
        d: dict = {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "image": self.image,
            "game": self.game,
            "common_locations": self.common_locations,
            "drops": self.drops,
            "obtaining_methods": self.obtaining_methods,
            "appearances": self.appearances,
            "related_items": self.related_items,
            "weaknesses": self.weaknesses,
            "properties": self.properties,
        }
        # Only include optional strings if non-empty
        for field_name in ("lore", "species", "gender", "age", "height", "habitat", "cooking_effect"):
            val = getattr(self, field_name, "")
            if val:
                d[field_name] = val
        if self.hearts_recovered is not None:
            d["hearts_recovered"] = self.hearts_recovered
        return d


# ──────────────────────────────────────────────────────────────────────────────
# HTTP session
# ──────────────────────────────────────────────────────────────────────────────
SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def get(url: str, params: Optional[dict] = None, retries: int = 3) -> Optional[requests.Response]:
    for attempt in range(1, retries + 1):
        try:
            resp = SESSION.get(url, params=params, timeout=15)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 404:
                return None
            if resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", 60))
                log.warning(f"Rate-limited — waiting {wait}s")
                time.sleep(wait)
        except requests.RequestException as exc:
            log.warning(f"Attempt {attempt}/{retries}: {exc}")
            time.sleep(CRAWL_DELAY * attempt)
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Game Name Expansion Map (for appearances and metadata)
# ──────────────────────────────────────────────────────────────────────────────
GAME_EXPANSIONS = {
    "TLoZ":  "The Legend of Zelda",
    "AoL":   "Zelda II: The Adventure of Link",
    "ALttP": "A Link to the Past",
    "LA":    "Link's Awakening",
    "OoT":   "Ocarina of Time",
    "MM":    "Majora's Mask",
    "OoA":   "Oracle of Ages",
    "OoS":   "Oracle of Seasons",
    "TWW":   "The Wind Waker",
    "FSA":   "Four Swords Adventures",
    "TMC":   "The Minish Cap",
    "TP":    "Twilight Princess",
    "PH":    "Phantom Hourglass",
    "ST":    "Spirit Tracks",
    "SS":    "Skyward Sword",
    "ALBW":  "A Link Between Worlds",
    "TFH":   "Tri Force Heroes",
    "BotW":  "Breath of the Wild",
    "TotK":  "Tears of the Kingdom",
    "FS":    "Four Swords",
    "HW":    "Hyrule Warriors",
    "AoC":   "Age of Calamity",
}

# ──────────────────────────────────────────────────────────────────────────────
# Wikitext utilities — hardened against dirty wiki markup
# ──────────────────────────────────────────────────────────────────────────────

def _remove_templates(text: str, passes: int = 4) -> str:
    """
    Iteratively strip {{ ... }} templates.
    Multiple passes handle nesting: {{outer|{{inner}}|words}}.
    Also strips unclosed {{ ... up to end-of-line as a final catch.
    """
    pattern = re.compile(r'\{\{[^{}]*\}\}')
    for _ in range(passes):
        prev = text
        text = pattern.sub('', text)
        if text == prev:
            break
    # Catch any remaining opening {{ to end of line
    text = re.sub(r'\{\{[^\n]*', '', text)
    # Lone closing braces leftover
    text = re.sub(r'\}\}', '', text)
    return text


def _clean(text: str) -> str:
    """
    Convert raw wikitext/HTML fragment to a clean plain-text string.
    Order matters: templates first, then links, then HTML, then URLs.
    """
    if not text:
        return ''

    # 1. Strip templates (nested-aware)
    text = _remove_templates(text)

    # 2. Wiki links: [[Page|Label]] → Label,  [[Page]] → Page
    text = re.sub(r'\[\[(?:[^\|\]]+\|)?([^\]]*)\]\]', r'\1', text)

    # 3. External links: [https://... Label] → Label
    text = re.sub(r'\[https?://[^\s\]]+\s+([^\]]+)\]', r'\1', text)

    # 4. Any remaining external link with no label → remove
    text = re.sub(r'\[https?://[^\]]*\]', '', text)

    # 5. Bare URLs (https://... or http://...)
    text = re.sub(r'https?://\S+', '', text)

    # 6. Domain fragments that slipped through (e.g. "fn.net/ganon", "wiki.com/foo")
    text = re.sub(r'\b\w+\.(?:net|com|org|wiki|fandom|gamepedia)\b(?:/\S*)?', '', text, flags=re.IGNORECASE)

    # 7. Bold/italic markup
    text = re.sub(r"'{2,3}", '', text)

    # 8. <ref>...</ref> — including multi-line
    text = re.sub(r'<ref[^/]*/?>.*?</ref>', '', text, flags=re.S)
    text = re.sub(r'<ref[^>]*/>', '', text)   # self-closing <ref name="x"/>

    # 9. All remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # 10. Wiki table artifacts: {| ... |} lines
    text = re.sub(r'^\{\|.*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\|\-.*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\|.*$', '', text, flags=re.MULTILINE)   # table cells at line start

    # 11. Custom header markers (e.g. == Nomenclature ==)
    text = re.sub(r'={2,}.*?={2,}', '', text)
    text = re.sub(r'=', '', text)

    # 12. Collapse whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{2,}', ' ', text)
    return text.strip()


# Characters that indicate a value is wiki garbage, not a real item name
_JUNK_PATTERNS = re.compile(
    r'https?://'           # bare URL
    r'|\{\{'               # unclosed template
    r'|\}\}'               # unclosed template end
    r'|\[\['               # unclosed wiki link
    r'|^\s*\|'             # table cell
    r'|^\s*\!'             # table header
    r'|\b\w+\.(?:net|com|org|wiki)\b'  # domain fragment
    r'|^[#*:;]+',          # list markup character
    re.IGNORECASE
)

def _is_valid_item(s: str) -> bool:
    """Return True only if s looks like a legitimate text label."""
    if not s or len(s.strip()) < 2:
        return False
    if len(s) > 100:
        return False
    if _JUNK_PATTERNS.search(s):
        return False
    # Must contain at least one letter
    if not re.search(r'[A-Za-z]', s):
        return False
    return True


def _extract_list(wikitext: str, *keys: str) -> list[str]:
    pat   = '|'.join(re.escape(k) for k in keys)
    regex = re.compile(rf'\|\s*(?:{pat})[^=]*=\s*([^\|\}}\n]+)', re.IGNORECASE)
    is_appearance = any(k in ["appearances", "game", "games"] for k in keys)
    
    results: list[str] = []
    for m in regex.finditer(wikitext):
        raw   = _clean(m.group(1))
        parts = [p.strip() for p in re.split(r'[,\n<br>•*;]+', raw)]
        for p in parts:
            if _is_valid_item(p):
                # Expand game abbreviations if this is the appearances field
                if is_appearance and p in GAME_EXPANSIONS:
                    results.append(GAME_EXPANSIONS[p])
                else:
                    results.append(p)
    # Deduplicate preserving order, return max 12
    seen: dict[str, bool] = {}
    unique: list[str] = []
    for r in results:
        if r not in seen:
            seen[r] = True
            unique.append(r)
    return unique[:12]


def _extract_scalar(wikitext: str, *keys: str) -> Optional[str]:
    pat = '|'.join(re.escape(k) for k in keys)
    m   = re.search(rf'\|\s*(?:{pat})[^=]*=\s*([^\|\}}\n]+)', wikitext, re.IGNORECASE)
    if not m:
        return None
    val = _clean(m.group(1))
    return val if _is_valid_item(val) else None


def _extract_number(wikitext: str, *keys: str) -> Optional[float]:
    val = _extract_scalar(wikitext, *keys)
    if val:
        m = re.search(r'[\d.]+', val)
        if m:
            try:
                return float(m.group())
            except ValueError:
                pass
    return None



# ──────────────────────────────────────────────────────────────────────────────
# HTML paragraph extraction
# ──────────────────────────────────────────────────────────────────────────────
def _extract_paragraphs(html: str, max_intro: int = 2, max_lore: int = 3) -> tuple[str, str]:
    """
    Returns (intro_description, lore_text).
    intro_description = first 1-2 substantial paragraphs.
    lore_text         = up to 3 additional paragraphs from the 'Characteristics', 'Background',
                        or 'Lore' sections of the article.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Remove noisy elements
    for tag in soup.select(".infobox, .navbox, .toc, sup, .mw-editsection, .reference, .hatnote"):
        tag.decompose()

    paras = [re.sub(r"\s+", " ", p.get_text(" ", strip=True)) for p in soup.find_all("p")]
    substantial = [p for p in paras if len(p) > 50]

    intro = " ".join(substantial[:max_intro])
    lore = " ".join(substantial[max_intro:max_intro + max_lore]) if len(substantial) > max_intro else ""

    return intro or "—", lore


# ──────────────────────────────────────────────────────────────────────────────
# MediaWiki category enumeration
# The Zelda wiki uses FULL game names (not abbreviations) in category titles:
# e.g. "Enemies in Ocarina of Time", "Items in Ocarina of Time"
# Multiple fallback suffixes are tried per compendium category.
# ──────────────────────────────────────────────────────────────────────────────

# Maps our compendium category → ordered list of wiki category prefixes to try
CAT_SUFFIXES: dict[str, list[str]] = {
    "monsters":  ["Enemies", "Bosses"],
    "equipment": ["Items", "Equipment", "Weapons", "Armor"],
    "materials": ["Items"],           # materials are usually under Items
    "creatures": ["Characters", "Enemies"],  # some creatures are characters
    "treasure":  ["Items", "Treasure"],
}


def list_category_pages(game: str, category: str) -> list[str]:
    """
    Enumerate wiki pages by fetching categorymembers using full game names.
    Tries each suffix in CAT_SUFFIXES[category]; stops at the first that yields results.
    """
    fallbacks = CAT_SUFFIXES.get(category, ["Items"])
    collected: list[str] = []

    for suffix in fallbacks:
        cat_name = f"{suffix} in {game}"  # e.g. "Enemies in Ocarina of Time"
        titles: list[str] = []
        cont: Optional[str] = None

        while True:
            params: dict = {
                "action":    "query",
                "list":      "categorymembers",
                "cmtitle":   f"Category:{cat_name}",
                "cmlimit":   "500",
                "cmnamespace": "0",
                "format":    "json",
            }
            if cont:
                params["cmcontinue"] = cont

            resp = get(WIKI_API, params=params)
            if not resp:
                break

            data = resp.json()
            batch = [
                m["title"] for m in data.get("query", {}).get("categorymembers", [])
                if ":" not in m["title"]  # exclude File:, Template: etc.
            ]
            titles.extend(batch)
            cont = data.get("continue", {}).get("cmcontinue")
            if not cont:
                break

        log.info(f"    {len(titles)} pages in Category:{cat_name}")
        if titles:
            collected.extend(titles)
            break  # stop trying fallbacks once we found results

    # Deduplicate preserving order
    seen: dict[str, bool] = {}
    unique: list[str] = []
    for t in collected:
        if t not in seen:
            seen[t] = True
            unique.append(t)
    return unique


# ──────────────────────────────────────────────────────────────────────────────
# Deep wiki page parser
# ──────────────────────────────────────────────────────────────────────────────
def parse_page(title: str, game: str, category: str, entry_id: int) -> Optional[CompendiumEntry]:
    # Wikitext + image list
    wt_resp = get(WIKI_API, params={
        "action": "parse", "page": title, "prop": "wikitext|images", "format": "json",
    })
    if not wt_resp:
        return None
    wt_data  = wt_resp.json().get("parse", {})
    wikitext = wt_data.get("wikitext", {}).get("*", "")

    # Full HTML for description + lore
    html_resp = get(WIKI_API, params={
        "action": "parse", "page": title, "prop": "text", "format": "json",
    })
    description, lore = f"{title} is an entry in {game}.", ""
    if html_resp:
        html = html_resp.json().get("parse", {}).get("text", {}).get("*", "")
        description, lore = _extract_paragraphs(html)

    # ── HQ Image via imageinfo API ───────────────────────────────────────────
    images: list[str] = wt_data.get("images", [])
    image_url = ""

    # Prefer image whose filename contains words from the article title
    title_words = [w.lower() for w in title.split() if len(w) > 2]
    candidate_images = [img for img in images if any(w in img.lower() for w in title_words)]
    if not candidate_images and images:
        candidate_images = images[:3]  # fallback: try first few images

    for img_name in candidate_images[:3]:
        ii_resp = get(WIKI_API, params={
            "action": "query",
            "titles": f"File:{img_name}",
            "prop": "imageinfo",
            "iiprop": "url",
            "format": "json",
        })
        if ii_resp:
            pages = ii_resp.json().get("query", {}).get("pages", {})
            for pg in pages.values():
                ii = pg.get("imageinfo", [{}])[0]
                url = ii.get("url", "")
                if url and not url.endswith(".svg"):  # skip SVG diagrams
                    image_url = url
                    break
        if image_url:
            break
        time.sleep(0.5)

    # Last resort: Special:FilePath redirect
    if not image_url and images:
        image_url = f"https://zelda.fandom.com/wiki/Special:FilePath/{quote(images[0].replace(' ', '_'))}"

    # ── Infobox scalars ──────────────────────────────────────────────────────
    def sc(*keys: str) -> Optional[str]:  return _extract_scalar(wikitext, *keys)
    def ls(*keys: str) -> list[str]:      return _extract_list(wikitext, *keys)
    def num(*keys: str) -> Optional[float]: return _extract_number(wikitext, *keys)

    # Character / creature info
    species  = sc("race", "species", "type", "class") or ""
    gender   = sc("gender", "sex") or ""
    age      = sc("age") or ""
    height   = sc("height") or ""
    habitat  = sc("habitat", "environment") or ""

    # Combat properties
    props: dict = {}
    attack   = num("attack", "attack power")
    damage   = num("damage")
    defense  = num("defense")
    hp       = num("hp", "health", "life")
    dur      = num("durability")
    sell     = num("sell_value", "sell value", "sell price", "selling price", "sell")
    buy      = num("buy_value", "buy value", "buy price", "buying price", "buy")
    effect   = sc("effect", "bonus effect", "cooking effect")

    if attack:  props["attack"]     = int(attack)
    if damage:  props["damage"]     = int(damage)
    if defense: props["defense"]    = int(defense)
    if hp:      props["hp"]         = int(hp)
    if dur:     props["durability"] = int(dur)
    if sell:    props["sell_price"] = int(sell)
    if buy:     props["buy_price"]  = int(buy)
    if effect:  props["effect"]     = effect

    # Lists
    weaknesses       = ls("weakness", "weaknesses", "weak to", "vulnerable to")
    drops            = ls("drops", "loot", "rewards", "spoils", "gives")
    locations        = ls("location", "common location", "habitat", "found in", "found at")
    obtaining        = ls("obtaining", "how to obtain", "method", "source", "acquisition")
    related          = ls("related", "related items", "see also", "associated")
    appearances_raw  = ls("appearances", "game", "games")

    # Cooking / food stats
    cooking_effect = sc("cooking effect", "cooked effect", "meal bonus") or ""
    hearts_raw     = num("hearts", "hearts recovered", "heart recovery", "hearts restored")

    return CompendiumEntry(
        id=entry_id, name=title, category=category,
        description=description.strip(), lore=lore.strip(),
        image=image_url, game=game,
        species=species, gender=gender, age=age, height=height, habitat=habitat,
        common_locations=locations, drops=drops, obtaining_methods=obtaining,
        appearances=appearances_raw, related_items=related,
        weaknesses=weaknesses, cooking_effect=cooking_effect,
        hearts_recovered=hearts_raw, properties=props,
    )


# ──────────────────────────────────────────────────────────────────────────────
# BotW / TotK structured API
# ──────────────────────────────────────────────────────────────────────────────
def fetch_hyrule_api(url: str, game: str, start_id: int) -> list[CompendiumEntry]:
    log.info(f"Fetching Hyrule API: {game} …")
    resp = get(url)
    if not resp:
        log.warning(f"API unavailable for {game}")
        return []

    raw: list[dict] = resp.json().get("data", [])
    entries: list[CompendiumEntry] = []
    CAT_MAP = {"creatures":"creatures","equipment":"equipment","materials":"materials","monsters":"monsters","treasure":"treasure"}

    for item in raw:
        cat  = CAT_MAP.get(item.get("category","").lower(), "treasure")
        p    = item.get("properties") or {}
        props: dict = {}

        # Map API fields → schema
        for api_key, schema_key in [
            ("attack",    "attack"),
            ("defense",   "defense"),
            ("effect",    "effect"),
            ("durability","durability"),
            ("sell_price","sell_price"),
            ("buy_price", "buy_price"),
            ("hp",        "hp"),
            ("damage",    "damage"),
        ]:
            if p.get(api_key) is not None:
                props[schema_key] = p[api_key]

        # Extra BotW fields sometimes nested differently
        cooking = p.get("cooking_effect", "") or p.get("effect", "") or ""
        hearts  = p.get("hearts_recovered") or p.get("hp_recover")

        entries.append(CompendiumEntry(
            id=start_id + item.get("id", len(entries)),
            name=item.get("name", "Unknown"),
            category=cat,
            description=item.get("description", "") or "",
            lore="",
            image=item.get("image", "") or "",
            game=game,
            common_locations=item.get("common_locations") or [],
            drops=item.get("drops") or [],
            appearances=[game],
            cooking_effect=cooking,
            hearts_recovered=float(hearts) if hearts else None,
            weaknesses=item.get("weakness") or [],
            properties=props,
        ))

    log.info(f"  {len(entries)} entries ({game})")
    return entries


# ──────────────────────────────────────────────────────────────────────────────
# MongoDB upsert
# ──────────────────────────────────────────────────────────────────────────────
def upsert_entries(col: Collection, entries: list[CompendiumEntry]) -> None:
    if not entries:
        return
    ops = [UpdateOne({"id": e.id}, {"$set": e.to_dict()}, upsert=True) for e in entries]
    r = col.bulk_write(ops, ordered=False)
    log.info(f"  DB → upserted {r.upserted_count}, modified {r.modified_count}")


class IdCounter:
    def __init__(self, start: int = 1):
        self._v = start
    def next(self) -> int:
        v = self._v; self._v += 1; return v
    @property
    def current(self) -> int:
        return self._v


# ──────────────────────────────────────────────────────────────────────────────
# Orchestration
# ──────────────────────────────────────────────────────────────────────────────
def run(games_filter: Optional[str], cats_filter: Optional[str], dry_run: bool, clear: bool) -> None:
    target_games = [g for g in GAMES if not games_filter or games_filter.lower() in g.lower()]
    target_cats  = [c for c in CATEGORIES if not cats_filter or c == cats_filter]

    col: Optional[Collection] = None
    if not dry_run:
        if not MONGODB_URI:
            log.error("MONGODB_URI not set"); return
        client = MongoClient(MONGODB_URI)
        col = client[MONGODB_DB][COLLECTION]
        if clear:
            n = col.delete_many({}).deleted_count
            log.info(f"Cleared {n} documents.")
        col.create_index("id", unique=True)
        col.create_index([("category", 1), ("game", 1)])
        col.create_index("name")

    counter = IdCounter(1)
    all_entries: list[CompendiumEntry] = []

    # BotW
    if "Breath of the Wild" in target_games:
        items = fetch_hyrule_api(HYRULE_API_BOTW, "Breath of the Wild", counter.current)
        counter._v += len(items) + 1
        all_entries.extend(items)
        time.sleep(CRAWL_DELAY)

    # TotK
    if "Tears of the Kingdom" in target_games:
        items = fetch_hyrule_api(HYRULE_API_TOTK, "Tears of the Kingdom", counter.current)
        counter._v += len(items) + 1
        all_entries.extend(items)
        time.sleep(CRAWL_DELAY)

    # All other games via Fandom Wiki
    wiki_games = [g for g in target_games if g not in ("Breath of the Wild", "Tears of the Kingdom")]
    for game in wiki_games:
        log.info(f"\n{'='*60}\nScraping: {game}")
        for cat in target_cats:
            log.info(f"  Category: {cat}")
            for title in list_category_pages(game, cat):
                eid = counter.next()
                log.info(f"    [{eid}] {title}")
                entry = parse_page(title, game, cat, eid)
                if entry:
                    all_entries.append(entry)
                time.sleep(CRAWL_DELAY)

    if dry_run:
        print(json.dumps([e.to_dict() for e in all_entries], indent=2, ensure_ascii=False))
        log.info(f"Dry run — {len(all_entries)} entries (not saved)")
    else:
        if col is not None:
            for i in range(0, len(all_entries), 500):
                upsert_entries(col, all_entries[i:i+500])
        log.info(f"\nDone — {len(all_entries)} entries written to MongoDB.")


# ──────────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="Hyrule Compendium — Deep Data Scraper v3")
    parser.add_argument("--game",     "-g",                     help="Game name filter (partial match)")
    parser.add_argument("--category", "-c", choices=CATEGORIES, help="Category filter")
    parser.add_argument("--dry-run",  "-n", action="store_true",help="Print JSON, no DB write")
    parser.add_argument("--clear",          action="store_true",help="Drop collection before scraping")
    args = parser.parse_args()
    run(args.game, args.category, args.dry_run, args.clear)

if __name__ == "__main__":
    main()
