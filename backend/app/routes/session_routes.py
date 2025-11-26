# app/routes/session_routes.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models.db import get_sessions_collection
from bson import ObjectId

session_bp = Blueprint("session", __name__)

def to_obj_id(id_str):
    """Safely convert string to ObjectId"""
    try:
        return ObjectId(id_str)
    except:
        return None


@session_bp.route("/start", methods=["POST"])
def start_session():
    try:
        data = request.get_json() or {}
        user_id = data.get("user_id", "user_001")  # default to your test user

        session = {
            "user_id": user_id,
            "start_time": datetime.utcnow(),
            "end_time": None,
            "total_checks": 0,
            "good_posture_count": 0,
            "bad_posture_count": 0,
            "corrections": 0
        }

        result = get_sessions_collection().insert_one(session)
        return jsonify({
            "success": True,
            "session_id": str(result.inserted_id),
            "message": "Session started"
        }), 201

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@session_bp.route("/end", methods=["POST"])
def end_session():
    try:
        data = request.get_json() or {}
        session_id = data.get("session_id")
        if not session_id:
            return jsonify({"success": False, "error": "session_id required"}), 400

        obj_id = to_obj_id(session_id)
        if not obj_id:
            return jsonify({"success": False, "error": "Invalid session_id"}), 400

        result = get_sessions_collection().update_one(
            {"_id": obj_id},
            {"$set": {
                "end_time": datetime.utcnow()
                # final_stats optional — only if frontend sends it
            }}
        )

        if result.matched_count == 0:
            return jsonify({"success": False, "error": "Session not found"}), 404

        return jsonify({"success": True, "message": "Session ended"}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@session_bp.route("/recent", methods=["GET"])
def get_recent_sessions():
    try:
        user_id = request.args.get("user_id", "user_001")
        limit = int(request.args.get("limit", 10))

        sessions = list(
            get_sessions_collection()
            .find({"user_id": user_id})           # ← CRITICAL: filter by user
            .sort("start_time", -1)
            .limit(limit)
        )

        serialized = []
        for s in sessions:
            serialized.append({
                "session_id": str(s["_id"]),
                "user_id": s.get("user_id"),
                "start_time": s["start_time"].isoformat() if s.get("start_time") else None,
                "end_time": s["end_time"].isoformat() if s.get("end_time") else None,
                "duration_seconds": (
                    (s["end_time"] - s["start_time"]).total_seconds()
                    if s.get("end_time") and s.get("start_time") else None
                ),
                "total_checks": s.get("total_checks", 0),
                "good_posture_count": s.get("good_posture_count", 0),
                "bad_posture_count": s.get("bad_posture_count", 0),
                "corrections": s.get("corrections", 0),
                "score": round(
                    s.get("good_posture_count", 0) / max(s.get("total_checks", 1), 1) * 100, 1
                )
            })

        return jsonify({"success": True, "sessions": serialized}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500