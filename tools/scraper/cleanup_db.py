"""
cleanup_db.py — One-shot sanitizer for dirty Compendium data in MongoDB.

Applies the same cleaning rules as the hardened scraper v4 to every document
already in the database, removing wiki artifacts like:
  • bare URLs ("https://...")
  • domain fragments ("fn.net/ganon")
  • unclosed templates ("{{monster")
  • table markup ("|" at start of value)

Run once after importing scraped data:
    python cleanup_db.py

Or in dry-run mode to preview changes without writing:
    python cleanup_db.py --dry-run
"""

import argparse
import os
import re
import logging
from typing import Any, Optional
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

# ──────────────────────────────────────────────────────────────────────────────
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB  = os.getenv("MONGODB_DB", "hyrule_compendium")
COLLECTION  = "compendiumentries"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)


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
# Cleaning logic (mirrors scraper.py)
# ──────────────────────────────────────────────────────────────────────────────
def _remove_templates(text: str, passes: int = 4) -> str:
    pattern = re.compile(r'\{\{[^{}]*\}\}')
    for _ in range(passes):
        prev = text
        text = pattern.sub('', text)
        if text == prev:
            break
    text = re.sub(r'\{\{[^\n]*', '', text)
    text = re.sub(r'\}\}', '', text)
    return text


def _clean(text: str) -> str:
    if not text or not isinstance(text, str):
        return ''
    text = _remove_templates(text)
    text = re.sub(r'\[\[(?:[^\|\]]+\|)?([^\]]*)\]\]', r'\1', text)
    text = re.sub(r'\[https?://[^\s\]]+\s+([^\]]+)\]', r'\1', text)
    text = re.sub(r'\[https?://[^\]]*\]', '', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\b\w+\.(?:net|com|org|wiki|fandom|gamepedia)\b(?:/\S*)?', '', text, flags=re.IGNORECASE)
    text = re.sub(r"'{2,3}", '', text)
    text = re.sub(r'<ref[^/]*/?>.*?</ref>', '', text, flags=re.S)
    text = re.sub(r'<ref[^>]*/>', '', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'^\{\|.*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\|\-.*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\|.*$', '', text, flags=re.MULTILINE)
    
    # Remove wikitext headers
    text = re.sub(r'={2,}.*?={2,}', '', text)
    text = re.sub(r'=', '', text)

    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{2,}', ' ', text)
    return text.strip()


_JUNK = re.compile(
    r'https?://'
    r'|\{\{'
    r'|\}\}'
    r'|\[\['
    r'|^\s*\|'
    r'|^\s*\!'
    r'|\b\w+\.(?:net|com|org|wiki)\b'
    r'|^[#*:;]+',
    re.IGNORECASE
)


def _is_valid(s: str) -> bool:
    if not s or len(s.strip()) < 2 or len(s) > 100:
        return False
    if _JUNK.search(s):
        return False
    if not re.search(r'[A-Za-z]', s):
        return False
    return True


def _clean_list(items: Any, field_name: str = "") -> list[str]:
    """Clean and filter a list field."""
    if not isinstance(items, list):
        return []
    result = []
    is_appearance = field_name in ["appearances", "game", "games"]
    for item in items:
        if not isinstance(item, str):
            continue
        cleaned = _clean(item)
        if _is_valid(cleaned):
            # Expand abbreviations
            if is_appearance and cleaned in GAME_EXPANSIONS:
                result.append(GAME_EXPANSIONS[cleaned])
            else:
                result.append(cleaned)
    return result


def _clean_str(val: Any) -> Optional[str]:
    """Clean a scalar string field."""
    if not val or not isinstance(val, str):
        return None
    cleaned = _clean(val)
    return cleaned if cleaned else None


# Fields that are lists of strings
LIST_FIELDS = [
    'common_locations',
    'drops',
    'obtaining_methods',
    'appearances',
    'related_items',
    'weaknesses',
]

# Fields that are plain strings
STR_FIELDS = [
    'description',
    'lore',
    'species',
    'gender',
    'age',
    'height',
    'habitat',
    'cooking_effect',
]


# ──────────────────────────────────────────────────────────────────────────────
def cleanup(dry_run: bool = False) -> None:
    if not MONGODB_URI:
        log.error("MONGODB_URI not set in .env"); return

    client = MongoClient(MONGODB_URI)
    col    = client[MONGODB_DB][COLLECTION]
    total  = col.count_documents({})
    log.info(f"Total documents: {total}")

    ops: list[UpdateOne] = []
    changed = 0
    checked = 0

    for doc in col.find({}, projection={f: 1 for f in LIST_FIELDS + STR_FIELDS + ['properties']}):
        updates: dict[str, Any] = {}
        unsets:  dict[str, int] = {}

        # --- List fields ---
        for field in LIST_FIELDS:
            original = doc.get(field)
            if original is None:
                continue
            cleaned = _clean_list(original, field)
            if cleaned != original:
                if cleaned:
                    updates[field] = cleaned
                else:
                    unsets[field] = 1

        # --- String fields ---
        for field in STR_FIELDS:
            original = doc.get(field)
            if not original:
                continue
            cleaned = _clean_str(original)
            if cleaned != original:
                if cleaned:
                    updates[field] = cleaned
                else:
                    unsets[field] = 1

        # --- Properties sub-document (effect field) ---
        props = doc.get('properties', {})
        if isinstance(props, dict):
            effect = props.get('effect')
            if effect and isinstance(effect, str):
                cleaned_effect = _clean_str(effect)
                if cleaned_effect != effect:
                    if cleaned_effect:
                        updates['properties.effect'] = cleaned_effect
                    else:
                        unsets['properties.effect'] = 1

        checked += 1
        if updates or unsets:
            changed += 1
            op_set: dict[str, Any] = {}
            if updates:
                op_set['$set'] = updates
            if unsets:
                op_set['$unset'] = unsets

            if not dry_run:
                ops.append(UpdateOne({'_id': doc['_id']}, op_set))
            else:
                log.info(f"  [{doc.get('_id')}] Would update: {list(updates.keys()) + list(unsets.keys())}")

        # Flush in batches of 500
        if ops and len(ops) >= 500:
            result = col.bulk_write(ops, ordered=False)
            log.info(f"  Flushed 500 ops (modified: {result.modified_count})")
            ops.clear()

    # Final flush
    if ops and not dry_run:
        result = col.bulk_write(ops, ordered=False)
        log.info(f"  Final flush (modified: {result.modified_count})")

    log.info(f"\nDone. Checked {checked} docs, {changed} needed cleaning.{' (DRY RUN — no writes)' if dry_run else ''}")


# ──────────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="Sanitize dirty wiki data in the Compendium DB")
    parser.add_argument('--dry-run', '-n', action='store_true',
                        help='Preview changes without writing to DB')
    args = parser.parse_args()
    cleanup(dry_run=args.dry_run)


if __name__ == '__main__':
    main()
