# rewards_routes.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from app.models.db import (
    get_user_achievements_collection,
    get_sessions_collection
)
from bson import ObjectId

rewards_bp = Blueprint("rewards", __name__)


# Badge definitions with unlock conditions
BADGES = {
    "first_steps": {
        "id": "first_steps",
        "name": "First Steps",
        "description": "Complete your first 10-minute session",
        "icon": "🥉",
        "points": 50
    },
    "posture_newbie": {
        "id": "posture_newbie",
        "name": "Posture Newbie",
        "description": "Accumulate 1 hour of monitoring time",
        "icon": "🥈",
        "points": 100
    },
    "posture_pro": {
        "id": "posture_pro",
        "name": "Posture Pro",
        "description": "Accumulate 10 hours of monitoring time",
        "icon": "🥇",
        "points": 500
    },
    "perfect_posture": {
        "id": "perfect_posture",
        "name": "Perfect Posture",
        "description": "Maintain 95%+ good posture in a session",
        "icon": "⭐",
        "points": 200
    },
    "century_club": {
        "id": "century_club",
        "name": "Century Club",
        "description": "Complete 100 monitoring sessions",
        "icon": "💯",
        "points": 1000
    },
    "accuracy_master": {
        "id": "accuracy_master",
        "name": "Accuracy Master",
        "description": "Maintain 90%+ good posture for 5 sessions straight",
        "icon": "🎯",
        "points": 300
    },
    "correction_king": {
        "id": "correction_king",
        "name": "Correction King",
        "description": "Correct your posture 100 times",
        "icon": "👑",
        "points": 250
    },
    "marathon_monitor": {
        "id": "marathon_monitor",
        "name": "Marathon Monitor",
        "description": "Complete a 2-hour monitoring session",
        "icon": "🏃",
        "points": 400
    }
}


def calculate_level(total_points):
    if total_points < 1000:
        return 1 + (total_points // 200)
    elif total_points < 5000:
        return 5 + ((total_points - 1000) // 800)
    elif total_points < 15000:
        return 10 + ((total_points - 5000) // 2000)
    elif total_points < 50000:
        return 15 + ((total_points - 15000) // 7000)
    else:
        return 20 + ((total_points - 50000) // 10000)


def get_next_level_points(current_level):
    if current_level < 5:
        return (current_level + 1) * 200
    elif current_level < 10:
        return 1000 + (current_level - 4) * 800
    elif current_level < 15:
        return 5000 + (current_level - 9) * 2000
    elif current_level < 20:
        return 15000 + (current_level - 14) * 7000
    else:
        return 50000 + (current_level - 19) * 10000


@rewards_bp.route("/user/<user_id>/achievements", methods=["GET"])
def get_user_achievements(user_id):
    try:
        user_achievement = get_user_achievements_collection().find_one({"user_id": user_id})

        if not user_achievement:
            user_achievement = {
                "user_id": user_id,
                "total_points": 0,
                "level": 1,
                "badges": [],
                "points_history": [],
                "stats": {
                    "total_sessions": 0,
                    "total_monitoring_hours": 0,
                    "best_session_score": 0,
                    "total_corrections": 0,
                    "consecutive_good_sessions": 0
                },
                "created_at": datetime.utcnow(),
                "last_updated": datetime.utcnow()
            }
            get_user_achievements_collection().insert_one(user_achievement)

        current_level = calculate_level(user_achievement["total_points"])
        next_level_points = get_next_level_points(current_level)

        unlocked_badges = []
        locked_badges = []

        for badge_id, badge_info in BADGES.items():
            if badge_id in user_achievement.get("badges", []):
                unlocked_badges.append(badge_info)
            else:
                locked_badges.append(badge_info)

        return jsonify({
            "success": True,
            "total_points": user_achievement.get("total_points", 0),
            "level": current_level,
            "next_level_points": next_level_points,
            "points_to_next_level": next_level_points - user_achievement.get("total_points", 0),
            "unlocked_badges": unlocked_badges,
            "locked_badges": locked_badges,
            "points_history": user_achievement.get("points_history", [])[-50:],
            "stats": user_achievement.get("stats", {})
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@rewards_bp.route("/user/<user_id>/award-points", methods=["POST"])
def award_points(user_id):
    try:
        data = request.json
        points = data.get("points", 0)
        reason = data.get("reason", "Action completed")
        session_id = data.get("session_id")

        user_achievement = get_user_achievements_collection().find_one({"user_id": user_id})

        if not user_achievement:
            user_achievement = {
                "user_id": user_id,
                "total_points": 0,
                "level": 1,
                "badges": [],
                "points_history": [],
                "stats": {},
                "created_at": datetime.utcnow()
            }

        new_total = user_achievement.get("total_points", 0) + points

        history_entry = {
            "points": points,
            "reason": reason,
            "timestamp": datetime.utcnow(),
            "session_id": session_id
        }

        points_history = user_achievement.get("points_history", [])
        points_history.append(history_entry)

        get_user_achievements_collection().update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "total_points": new_total,
                    "points_history": points_history,
                    "last_updated": datetime.utcnow()
                }
            },
            upsert=True
        )

        return jsonify({
            "success": True,
            "points_awarded": points,
            "new_total": new_total,
            "reason": reason
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@rewards_bp.route("/user/<user_id>/unlock-badge", methods=["POST"])
def unlock_badge(user_id):
    try:
        data = request.json
        badge_id = data.get("badge_id")

        if badge_id not in BADGES:
            return jsonify({"success": False, "error": "Invalid badge ID"}), 400

        badge_info = BADGES[badge_id]
        user_achievement = get_user_achievements_collection().find_one({"user_id": user_id})

        if not user_achievement:
            return jsonify({"success": False, "error": "User not found"}), 404

        if badge_id in user_achievement.get("badges", []):
            return jsonify({"success": False, "error": "Badge already unlocked"}), 400

        badges = user_achievement.get("badges", [])
        badges.append(badge_id)

        points_to_award = badge_info["points"]
        new_total = user_achievement.get("total_points", 0) + points_to_award

        history_entry = {
            "points": points_to_award,
            "reason": f"Unlocked badge: {badge_info['name']}",
            "timestamp": datetime.utcnow(),
            "badge_id": badge_id
        }

        points_history = user_achievement.get("points_history", [])
        points_history.append(history_entry)

        get_user_achievements_collection().update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "badges": badges,
                    "total_points": new_total,
                    "points_history": points_history,
                    "last_updated": datetime.utcnow()
                }
            }
        )

        return jsonify({
            "success": True,
            "badge": badge_info,
            "points_awarded": points_to_award,
            "new_total": new_total
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@rewards_bp.route("/user/<user_id>/check-achievements", methods=["POST"])
def check_achievements(user_id):
    try:
        sessions = list(get_sessions_collection().find({"user_id": user_id}))

        if not sessions:
            return jsonify({"success": True, "new_badges": []}), 200

        total_sessions = len(sessions)
        total_duration_seconds = 0
        total_corrections = 0
        best_score = 0
        good_session_streak = 0

        for session in sessions:
            if session.get("end_time") and session.get("start_time"):
                duration = (session["end_time"] - session["start_time"]).total_seconds()
                total_duration_seconds += duration

            total_corrections += session.get("corrections", 0)

            checks = session.get("total_checks", 0)
            if checks > 0:
                score = (session.get("good_posture_count", 0) / checks) * 100
                best_score = max(best_score, score)

                if score >= 90:
                    good_session_streak += 1
                else:
                    good_session_streak = 0

        total_hours = total_duration_seconds / 3600

        user_achievement = get_user_achievements_collection().find_one({"user_id": user_id})
        current_badges = user_achievement.get("badges", []) if user_achievement else []

        new_badges = []

        if "first_steps" not in current_badges and total_duration_seconds >= 600:
            new_badges.append("first_steps")

        if "posture_newbie" not in current_badges and total_hours >= 1:
            new_badges.append("posture_newbie")

        if "posture_pro" not in current_badges and total_hours >= 10:
            new_badges.append("posture_pro")

        if "perfect_posture" not in current_badges and best_score >= 95:
            new_badges.append("perfect_posture")

        if "century_club" not in current_badges and total_sessions >= 100:
            new_badges.append("century_club")

        if "accuracy_master" not in current_badges and good_session_streak >= 5:
            new_badges.append("accuracy_master")

        if "correction_king" not in current_badges and total_corrections >= 100:
            new_badges.append("correction_king")

        longest_session = max([
            (s.get("end_time") - s.get("start_time")).total_seconds()
            for s in sessions
            if s.get("end_time") and s.get("start_time")
        ]) if sessions else 0

        if "marathon_monitor" not in current_badges and longest_session >= 7200:
            new_badges.append("marathon_monitor")

        unlocked_badges = []
        for badge_id in new_badges:
            badge_info = BADGES[badge_id]
            unlocked_badges.append(badge_info)

            get_user_achievements_collection().update_one(
                {"user_id": user_id},
                {
                    "$addToSet": {"badges": badge_id},
                    "$inc": {"total_points": badge_info["points"]},
                    "$push": {
                        "points_history": {
                            "points": badge_info["points"],
                            "reason": f"Unlocked badge: {badge_info['name']}",
                            "timestamp": datetime.utcnow(),
                            "badge_id": badge_id
                        }
                    },
                    "$set": {"last_updated": datetime.utcnow()}
                },
                upsert=True
            )

        return jsonify({
            "success": True,
            "new_badges": unlocked_badges
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
