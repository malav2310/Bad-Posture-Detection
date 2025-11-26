# app/models/mydb.py
from flask import current_app
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# These are just placeholders — never use them directly
client = None
db = None

def init_db(app):
    """Call this from create_app() — MUST be done before importing routes"""
    load_dotenv()
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    
    app.mongodb_client = MongoClient(MONGO_URI)
    app.db = app.mongodb_client["posture_monitoring"]
    
    # Optional: test connection
    app.db.command("ping")
    print("MongoDB connected successfully")

def get_posture_collection():
    return current_app.db["posture_logs"]

def get_sessions_collection():
    return current_app.db["sessions"]