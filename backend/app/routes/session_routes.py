from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models.db import sessions_collection

session_bp = Blueprint("session", __name__)

@session_bp.route("/start", methods=["POST"])
def start_session():
    try:
        data = request.json
        session = {
            "user_id": data.get("user_id", "anonymous"),
            "start_time": datetime.utcnow(),
            "end_time": None,
            "total_checks": 0,
            "good_posture_count": 0,
            "bad_posture_count": 0,
            "corrections": 0
        }
        result = sessions_collection.insert_one(session)
        return jsonify({
            "success": True,
            "session_id": str(result.inserted_id),
            "message": "Session started successfully"
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@session_bp.route("/end", methods=["POST"])
def end_session():
    try:
        data = request.json
        session_id = data.get("session_id")
        if not session_id:
            return jsonify({"success": False, "error": "Session ID required"}), 400

        sessions_collection.update_one(
            {"_id": session_id},
            {"$set": {
                "end_time": datetime.utcnow(),
                "final_stats": {
                    "total_duration": data.get("total_duration"),
                    "good_posture_percentage": data.get("good_posture_percentage"),
                    "total_corrections": data.get("total_corrections")
                }
            }}
        )

        return jsonify({"success": True, "message": "Session ended successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@session_bp.route("/recent", methods=["GET"])
def get_recent_sessions():
    try:
        limit = int(request.args.get("limit", 10))
        sessions = list(sessions_collection.find().sort("start_time", -1).limit(limit))

        for s in sessions:
            s["_id"] = str(s["_id"])
            if s.get("start_time"):
                s["start_time"] = s["start_time"].isoformat()
            if s.get("end_time"):
                s["end_time"] = s["end_time"].isoformat()

        return jsonify({"success": True, "sessions": sessions}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
