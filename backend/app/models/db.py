from pymongo import MongoClient
from dotenv import load_dotenv
import os

client = None
db = None
posture_collection = None
sessions_collection = None

def init_db(app):
    global client, db, posture_collection, sessions_collection

    load_dotenv()
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

    client = MongoClient(MONGO_URI)
    db = client["posture_monitoring"]
    posture_collection = db["posture_logs"]
    sessions_collection = db["sessions"]

    print("✅ MongoDB connected:", MONGO_URI)
