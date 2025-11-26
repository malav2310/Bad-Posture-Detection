# app/routes/posture_routes.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models.db import get_posture_collection, get_sessions_collection
from bson import ObjectId

posture_bp = Blueprint("posture", __name__)

def to_obj_id(id_str):
    try:
        return ObjectId(id_str)
    except:
        return None


@posture_bp.route("/log", methods=["POST"])
def log_posture():
    try:
        data = request.get_json() or {}
        session_id_str = data.get("session_id")
        if not session_id_str:
            return jsonify({"success": False, "error": "session_id required"}), 400

        session_id = to_obj_id(session_id_str)
        if not session_id:
            return jsonify({"success": False, "error": "Invalid session_id"}), 400

        # Insert posture log
        log = {
            "session_id": session_id,
            "timestamp": datetime.utcnow(),
            "posture_status": data.get("posture_status"),
            "left_angle": data.get("left_angle"),
            "right_angle": data.get("right_angle"),
            "total_angle": data.get("total_angle"),
            "issues": data.get("issues", []),
            "feedback": data.get("feedback"),
            "was_corrected": data.get("was_corrected", False),
            "duration_seconds": data.get("duration_seconds", 10)
        }

        result = get_posture_collection().insert_one(log)

        # Update session stats
        get_sessions_collection().update_one(
            {"_id": session_id},
            {"$inc": {
                "total_checks": 1,
                "good_posture_count": 1 if data.get("posture_status") == "good" else 0,
                "bad_posture_count": 1 if data.get("posture_status") == "bad" else 0,
                "corrections": 1 if data.get("was_corrected") else 0
            }}
        )

        return jsonify({
            "success": True,
            "log_id": str(result.inserted_id),
            "message": "Posture logged"
        }), 201

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@posture_bp.route("/report/<session_id>", methods=["GET"])
def get_session_report(session_id):
    try:
        obj_id = to_obj_id(session_id)
        if not obj_id:
            return jsonify({"success": False, "error": "Invalid session_id"}), 400

        session = get_sessions_collection().find_one({"_id": obj_id})
        if not session:
            return jsonify({"success": False, "error": "Session not found"}), 404

        logs = list(get_posture_collection()
                    .find({"session_id": obj_id})
                    .sort("timestamp", 1))

        # Serialize session
        session_data = {
            "session_id": str(session["_id"]),
            "user_id": session.get("user_id"),
            "start_time": session["start_time"].isoformat() if session.get("start_time") else None,
            "end_time": session["end_time"].isoformat() if session.get("end_time") else None,
            "total_checks": session.get("total_checks", 0),
            "good_posture_count": session.get("good_posture_count", 0),
            "bad_posture_count": session.get("bad_posture_count", 0),
            "corrections": session.get("corrections", 0),
            "score": round(
                session.get("good_posture_count", 0) / max(session.get("total_checks", 1), 1) * 100, 1
            )
        }

        # Serialize logs
        logs_data = []
        for log in logs:
            logs_data.append({
                "log_id": str(log["_id"]),
                "session_id": str(log["session_id"]),
                "timestamp": log["timestamp"].isoformat(),
                "posture_status": log.get("posture_status"),
                "left_angle": log.get("left_angle"),
                "right_angle": log.get("right_angle"),
                "issues": log.get("issues", []),
                "feedback": log.get("feedback"),
                "was_corrected": log.get("was_corrected", False)
            })

        return jsonify({
            "success": True,
            "session": session_data,
            "logs": logs_data
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500