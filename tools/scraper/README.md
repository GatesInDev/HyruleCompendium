# Hyrule Compendium – Scraper Tool

A standalone Python utility that populates the MongoDB `compendiumentries` collection
with Zelda data scraped from public wikis. **Run once a year** or whenever you want
to refresh the database.

## Location

```
HyruleCompendium/
└── tools/
    └── scraper/
        ├── scraper.py        ← main script
        ├── requirements.txt  ← Python dependencies
        └── .env              ← MongoDB connection (already configured)
```

## Setup (one-time)

```bash
cd HyruleCompendium/tools/scraper

# Create a virtual environment (recommended)
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

## Usage

```bash
# Full run — all 19 games, all categories → writes to MongoDB
python scraper.py

# Dry run — prints JSON, does NOT touch the database
python scraper.py --dry-run

# Single game (partial name match)
python scraper.py --game "Tears of the Kingdom"
python scraper.py --game "Ocarina"

# Single category
python scraper.py --category monsters

# Combine filters
python scraper.py --game "Breath of the Wild" --category creatures

# Clean slate: drop entire collection before scraping
python scraper.py --clear
```

## Data sources

| Game(s)                          | Source                                |
|----------------------------------|---------------------------------------|
| Breath of the Wild               | `botw-compendium.herokuapp.com` API   |
| Tears of the Kingdom             | `botw-compendium.herokuapp.com` API   |
| All other games (NES → ALBW)     | Zelda Fandom Wiki MediaWiki API       |

The structured Hyrule Compendium API is used for BotW and TotK because it
provides clean, machine-readable data with images, descriptions, locations,
drops, and properties already parsed.

For older games the script uses the Zelda Fandom Wiki's MediaWiki API
(`/api.php`) to enumerate category members and parse infobox data from each
article — no HTML scraping fragility, fully structured JSON.

## Schema written to MongoDB

Each document matches the `CompendiumEntry` Mongoose schema:

| Field              | Type       | Notes                                       |
|--------------------|------------|---------------------------------------------|
| `id`               | Number     | Unique auto-increment across all games      |
| `name`             | String     | Article title / entry name                  |
| `category`         | String     | `creatures / equipment / materials / monsters / treasure` |
| `description`      | String     | First paragraph of the wiki article         |
| `image`            | String     | CDN URL via `Special:FilePath`               |
| `game`             | String     | Full game title string                       |
| `common_locations` | String[]   | Parsed from infobox                         |
| `drops`            | String[]   | Parsed from infobox                         |
| `properties`       | Object     | `{ attack?, defense?, effect? }`            |

All writes are **upserts** (by `id`), so re-running is safe and idempotent.
