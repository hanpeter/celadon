import hashlib
from unittest.mock import MagicMock, patch

import pytest

import celadon.server as server_module
from celadon.models.user import User
from tests.conftest import make_session_data


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(email='user@gmail.com', name='Test User', org_id=1):
    return User(id=1, email=email, name=name, organization_id=org_id)


@pytest.fixture(autouse=True)
def _server_testing():
    mock_db = MagicMock()
    mock_db.get_session.return_value = None
    server_module.server.config['TESTING'] = True
    server_module.server.session_interface._db = mock_db
    yield


@pytest.fixture
def auth_client():
    """Flask test client with a pre-authenticated session on the module server."""
    sid = 'test-session-id'
    mock_db = MagicMock()
    mock_db.get_session.return_value = make_session_data()
    server_module.server.session_interface._db = mock_db
    client = server_module.server.test_client()
    client.set_cookie('session', sid)
    yield client


# ---------------------------------------------------------------------------
# User model
# ---------------------------------------------------------------------------

class TestUserModel:
    def test_to_dict(self):
        user = _make_user()
        d = user.to_dict()
        assert d == {
            'id': 1,
            'email': 'user@gmail.com',
            'name': 'Test User',
            'organization_id': 1,
        }

    def test_select_one_by_email_query_contains_where_clause(self):
        assert 'WHERE' in User.SELECT_ONE_BY_EMAIL
        assert 'email' in User.SELECT_ONE_BY_EMAIL


# ---------------------------------------------------------------------------
# Database.get_user_by_email
# ---------------------------------------------------------------------------

class TestDatabaseGetUserByEmail:
    def test_returns_user_when_found(self, db_instance, mock_conn):
        from celadon.db import Database
        from tests.test_db import _make_cursor
        row = (1, 'user@gmail.com', 'Test User', 1)
        cur = _make_cursor(rows=[row])
        cur.fetchone.return_value = row
        mock_conn.cursor.return_value = cur
        result = db_instance.get_user_by_email('user@gmail.com')
        cur.execute.assert_called_once_with(User.SELECT_ONE_BY_EMAIL, ['user@gmail.com'])
        assert isinstance(result, User)
        assert result.email == 'user@gmail.com'

    def test_returns_none_when_not_found(self, db_instance, mock_conn):
        from tests.test_db import _make_cursor
        cur = _make_cursor(rows=[])
        cur.fetchone.return_value = None
        mock_conn.cursor.return_value = cur
        result = db_instance.get_user_by_email('unknown@gmail.com')
        assert result is None


# ---------------------------------------------------------------------------
# Application.get_user_by_email
# ---------------------------------------------------------------------------

class TestApplicationGetUserByEmail:
    def test_returns_dict_when_user_found(self, mock_db, app_instance):
        user = _make_user()
        mock_db.get_user_by_email.return_value = user
        result = app_instance.get_user_by_email('user@gmail.com')
        mock_db.get_user_by_email.assert_called_once_with('user@gmail.com')
        assert result == user.to_dict()

    def test_returns_none_when_user_not_found(self, mock_db, app_instance):
        mock_db.get_user_by_email.return_value = None
        result = app_instance.get_user_by_email('ghost@gmail.com')
        assert result is None


# ---------------------------------------------------------------------------
# require_login decorator
# ---------------------------------------------------------------------------

class TestRequireLogin:
    def test_unauthenticated_request_redirects_to_login(self):
        with server_module.server.test_client() as client:
            r = client.get('/')
        assert r.status_code == 302
        assert '/login' in r.headers['Location']

    def test_authenticated_request_passes_through(self, auth_client):
        r = auth_client.get('/')
        assert r.status_code == 200

    def test_all_api_routes_require_login(self):
        routes = ['/purchaser', '/purchase', '/customer', '/sale', '/item']
        with server_module.server.test_client() as client:
            for route in routes:
                r = client.get(route)
                assert r.status_code == 302, f'{route} should redirect unauthenticated requests'
                assert '/login' in r.headers['Location']


# ---------------------------------------------------------------------------
# /login route
# ---------------------------------------------------------------------------

class TestGoogleLoginRoute:
    def test_redirects_to_google(self):
        with patch('celadon.auth.oauth.google.authorize_redirect',
                   return_value=('', 302)) as mock_redirect:
            with server_module.server.test_client() as client:
                client.get('/auth/google')
        mock_redirect.assert_called_once()
        redirect_uri = mock_redirect.call_args[0][0]
        assert 'auth/google/callback' in redirect_uri


class TestLoginRoute:
    def test_get_login_returns_html(self):
        with server_module.server.test_client() as client:
            r = client.get('/login')
        assert r.status_code == 200
        assert b'<!DOCTYPE html>' in r.data or b'<html' in r.data

    def test_login_page_contains_google_auth_link(self):
        with server_module.server.test_client() as client:
            r = client.get('/login')
        assert b'/auth/google' in r.data


# ---------------------------------------------------------------------------
# /auth/google/callback
# ---------------------------------------------------------------------------

class TestGoogleCallback:
    def _mock_token(self, email='user@gmail.com', name='Test User'):
        return {'userinfo': {'email': email, 'name': name}}

    def test_known_user_sets_session_and_redirects(self, mock_app):
        mock_app.get_user_by_email.return_value = _make_user().to_dict()
        with server_module.server.test_client() as client:
            with patch('celadon.auth.oauth.google.authorize_access_token',
                       return_value=self._mock_token()):
                with patch('celadon.server.server.app', mock_app):
                    r = client.get('/auth/google/callback')
            assert r.status_code == 302
            assert r.headers['Location'] == '/'
            # Verify session was saved with hashed email as sid and permanent flag
            expected_sid = hashlib.sha256(b'user@gmail.com').hexdigest()
            upsert_call = server_module.server.session_interface._db.upsert_session
            upsert_call.assert_called_once()
            saved_sid = upsert_call.call_args[0][0]
            saved_data = upsert_call.call_args[0][1]
            assert saved_sid == expected_sid
            import pickle
            session_data = pickle.loads(saved_data)
            assert session_data['user_email'] == 'user@gmail.com'
            assert session_data['user_name'] == 'Test User'
            assert session_data.get('_permanent') is True

    def test_unknown_user_returns_403(self, mock_app):
        mock_app.get_user_by_email.return_value = None
        with server_module.server.test_client() as client:
            with patch('celadon.auth.oauth.google.authorize_access_token',
                       return_value=self._mock_token()):
                with patch('celadon.server.server.app', mock_app):
                    r = client.get('/auth/google/callback')
        assert r.status_code == 403

    def test_missing_userinfo_returns_403(self, mock_app):
        with server_module.server.test_client() as client:
            with patch('celadon.auth.oauth.google.authorize_access_token',
                       return_value={}):
                with patch('celadon.server.server.app', mock_app):
                    r = client.get('/auth/google/callback')
        assert r.status_code == 403

    def test_missing_email_in_userinfo_returns_403(self, mock_app):
        with server_module.server.test_client() as client:
            with patch('celadon.auth.oauth.google.authorize_access_token',
                       return_value={'userinfo': {'name': 'No Email'}}):
                with patch('celadon.server.server.app', mock_app):
                    r = client.get('/auth/google/callback')
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# PostgresSessionInterface
# ---------------------------------------------------------------------------

class TestSessionInterface:
    def test_open_session_with_stale_cookie_returns_new_session(self):
        """Line 30: cookie present but session not found in DB → new session."""
        mock_db = MagicMock()
        mock_db.get_session.return_value = None
        server_module.server.session_interface._db = mock_db
        client = server_module.server.test_client()
        client.set_cookie('session', 'stale-sid')
        r = client.get('/login')
        assert r.status_code == 200
        mock_db.get_session.assert_called_once_with('stale-sid')

    def test_save_session_skips_write_when_unmodified_and_not_permanent(self):
        """Line 48: session exists, not permanent, unmodified → no upsert called."""
        import pickle
        non_permanent_data = pickle.dumps({'user_email': 'user@gmail.com'})
        mock_db = MagicMock()
        mock_db.get_session.return_value = non_permanent_data
        server_module.server.session_interface._db = mock_db
        client = server_module.server.test_client()
        client.set_cookie('session', 'test-sid')
        client.get('/login')
        mock_db.upsert_session.assert_not_called()


# ---------------------------------------------------------------------------
# /logout
# ---------------------------------------------------------------------------

class TestLogout:
    def test_logout_clears_session_and_redirects(self):
        sid = 'test-session-id'
        mock_db = MagicMock()
        mock_db.get_session.return_value = make_session_data()
        server_module.server.session_interface._db = mock_db
        client = server_module.server.test_client()
        client.set_cookie('session', sid)
        r = client.get('/logout')
        assert r.status_code == 302
        assert '/login' in r.headers['Location']
        mock_db.delete_session.assert_called_once_with(sid)
