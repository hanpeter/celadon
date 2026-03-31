import hashlib
import os
import functools
from flask import Blueprint, session, redirect, url_for, abort, current_app, send_from_directory
from authlib.integrations.flask_client import OAuth

auth_bp = Blueprint('auth', __name__)
oauth = OAuth()


def init_oauth(app):
    oauth.init_app(app)
    oauth.register(
        name='google',
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_id=os.environ.get('GOOGLE_CLIENT_ID'),
        client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
        client_kwargs={'scope': 'openid email profile'},
    )


def require_login(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('user_email'):
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated


@auth_bp.route('/login')
def login():
    return send_from_directory(current_app.static_folder, 'login.html')


@auth_bp.route('/auth/google')
def google_login():
    redirect_uri = url_for('auth.google_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)


@auth_bp.route('/auth/google/callback')
def google_callback():
    token = oauth.google.authorize_access_token()
    userinfo = token.get('userinfo')
    if not userinfo:
        abort(403)

    email = userinfo.get('email')
    if not email:
        abort(403)

    user = current_app.app.get_user_by_email(email)
    if user is None:
        abort(403)

    session.sid = hashlib.sha256(email.encode()).hexdigest()
    session.permanent = True
    session['user_email'] = email
    session['user_name'] = userinfo.get('name', '')
    return redirect(url_for('index'))


@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.login'))
