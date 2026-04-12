from .kr_market import kr_bp


def register_blueprints(app):
    app.register_blueprint(kr_bp, url_prefix='/api/kr')
