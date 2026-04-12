from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from app.routes import register_blueprints


def create_app():
    load_dotenv()

    app = Flask(__name__)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    register_blueprints(app)

    return app
