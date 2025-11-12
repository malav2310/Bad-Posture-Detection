from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models.db import posture_collection, sessions_collection

posture_bp = Blueprint("posture", __name__)

@posture_bp.route("/log", methods=["POST"])
def log_posture():
    try:
        data = request.json
        posture_log = {
            "session_id": data.get("session_id"),
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

        result = posture_collection.insert_one(posture_log)

        if data.get("session_id"):
            update_data = {
                "$inc": {
                    "total_checks": 1,
                    "good_posture_count": 1 if data.get("posture_status") == "good" else 0,
                    "bad_posture_count": 1 if data.get("posture_status") == "bad" else 0,
                    "corrections": 1 if data.get("was_corrected") else 0
                }
            }
            sessions_collection.update_one(
                {"_id": data.get("session_id")},
                update_data
            )

        return jsonify({
            "success": True,
            "log_id": str(result.inserted_id),
            "message": "Posture logged successfully"
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@posture_bp.route("/report/<session_id>", methods=["GET"])
def get_session_report(session_id):
    try:
        session = sessions_collection.find_one({"_id": session_id})
        if not session:
            return jsonify({"success": False, "error": "Session not found"}), 404

        logs = list(posture_collection.find({"session_id": session_id}).sort("timestamp", 1))
        session["_id"] = str(session["_id"])

        for log in logs:
            log["_id"] = str(log["_id"])
            log["timestamp"] = log["timestamp"].isoformat()

        return jsonify({
            "success": True,
            "session": session,
            "logs": logs
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
