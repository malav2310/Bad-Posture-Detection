# app/routes/dashboard_routes.py
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from app.models.db import get_sessions_collection
from bson import ObjectId

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/stats", methods=["GET"])
def get_dashboard_stats():
    try:
        user_id = request.args.get("user_id", "user_001")
        days = int(request.args.get("days", 7))

        # Date range (last N days)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # ← Fixed: lazy collection access
        sessions_collection = get_sessions_collection()

        # Fetch sessions in the date range
        sessions_cursor = sessions_collection.find({
            "user_id": user_id,
            "start_time": {"$gte": start_date}
        }).sort("start_time", -1)

        sessions = list(sessions_cursor)

        # ── Hero Stats ──
        total_sessions = len(sessions)
        total_checks = sum(s.get("total_checks", 0) for s in sessions)
        total_good = sum(s.get("good_posture_count", 0) for s in sessions)
        total_bad = sum(s.get("bad_posture_count", 0) for s in sessions)
        total_corrections = sum(s.get("corrections", 0) for s in sessions)

        # Total monitoring time
        total_duration_seconds = 0
        for s in sessions:
            start = s.get("start_time")
            end = s.get("end_time")
            if start and end and isinstance(start, datetime) and isinstance(end, datetime):
                total_duration_seconds += (end - start).total_seconds()

        overall_score = round(total_good / total_checks * 100, 1) if total_checks > 0 else 0

        # ── Daily Breakdown ──
        daily_data = []
        for i in range(days):
            day_start = start_date + timedelta(days=i)
            day_end = day_start + timedelta(days=1)

            day_sessions = [
                s for s in sessions
                if s.get("start_time") and day_start <= s["start_time"] < day_end
            ]

            day_good = sum(s.get("good_posture_count", 0) for s in day_sessions)
            day_bad = sum(s.get("bad_posture_count", 0) for s in day_sessions)
            day_total = day_good + day_bad

            daily_data.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "day_label": day_start.strftime("%a"),
                "good": day_good,
                "bad": day_bad,
                "good_percentage": round(day_good / day_total * 100, 1) if day_total > 0 else 0
            })

        # ── Recent Sessions (last 10) ──
        recent_sessions = []
        for s in sessions[:10]:
            start = s.get("start_time")
            end = s.get("end_time")
            duration = (end - start).total_seconds() if start and end else 0

            checks = s.get("total_checks", 0)
            good = s.get("good_posture_count", 0)
            score = round(good / checks * 100, 1) if checks > 0 else 0

            recent_sessions.append({
                "session_id": str(s["_id"]),
                "start_time": start.isoformat() if start else None,
                "end_time": end.isoformat() if end else None,
                "duration_seconds": int(duration),
                "total_checks": checks,
                "good_count": good,
                "bad_count": s.get("bad_posture_count", 0),
                "corrections": s.get("corrections", 0),
                "score": score
            })

        # ── Final Response ──
        return jsonify({
            "success": True,
            "hero_stats": {
                "total_sessions": total_sessions,
                "total_monitoring_time_hours": round(total_duration_seconds / 3600, 1),
                "overall_posture_score": overall_score,
                "total_corrections": total_corrections
            },
            "posture_distribution": {
                "good": total_good,
                "bad": total_bad
            },
            "daily_trends": daily_data,
            "recent_sessions": recent_sessions
        }), 200

    except Exception as e:
        print(f"[ERROR] /stats endpoint failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500