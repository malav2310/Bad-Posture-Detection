from flask import Flask
from flask_cors import CORS
from .models.db import init_db

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Initialize MongoDB
    init_db(app)

    # Register Blueprints
    from .routes.health import health_bp
    from .routes.session_routes import session_bp
    from .routes.posture_routes import posture_bp

    app.register_blueprint(health_bp, url_prefix="/api/health")
    app.register_blueprint(session_bp, url_prefix="/api/session")
    app.register_blueprint(posture_bp, url_prefix="/api/posture")

    return app
