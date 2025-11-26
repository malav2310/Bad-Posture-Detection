from app import create_app
from app.routes.dashboard_routes import dashboard_bp
from app.models.db import init_db

app = create_app()

init_db(app)

app.register_blueprint(dashboard_bp, url_prefix="/dashboard")
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
