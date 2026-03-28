"""Quick diagnostic: connects to the production MongoDB and prints entry count + sample."""
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

uri = os.getenv("MONGODB_URI")
db_name = os.getenv("MONGODB_DB", "hyrule_compendium")

client = MongoClient(uri)
db = client[db_name]
col = db["compendiumentries"]

count = col.count_documents({})
print(f"Total documents: {count}")

sample = col.find_one({})
if sample:
    print("\nSample document keys:", list(sample.keys()))
    print("name:", sample.get("name"))
    print("game:", sample.get("game"))
    print("category:", sample.get("category"))
    print("image:", sample.get("image", "")[:80])
else:
    print("No documents found!")
