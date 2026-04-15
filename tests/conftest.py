import os
import pickle
import pytest
from unittest.mock import MagicMock, patch
from celadon.application import Application
from celadon.db import Database

os.environ.setdefault('DATABASE_URL', 'postgresql://test:test@localhost/test')

with patch('psycopg_pool.ConnectionPool', return_value=MagicMock()):
    from celadon.server import create_server


@pytest.fixture
def mock_conn():
    return MagicMock()


@pytest.fixture
def mock_pool(mock_conn):
    pool = MagicMock()
    pool.connection.return_value.__enter__ = lambda s: mock_conn
    pool.connection.return_value.__exit__ = MagicMock(return_value=False)
    return pool


@pytest.fixture
def db_instance(mock_pool):
    return Database(pool=mock_pool)


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.get_session.return_value = None
    return db


@pytest.fixture
def mock_app():
    return MagicMock(spec=Application)


@pytest.fixture
def app_instance(mock_db):
    return Application(mock_db)


@pytest.fixture
def flask_client(mock_app, mock_db):
    srv = create_server(application=mock_app, database=mock_db)
    srv.config['TESTING'] = True
    with srv.test_client() as client:
        yield client, mock_app


def make_session_data(user_email='user@gmail.com', user_name='Test User'):
    """Return pickled session bytes for a pre-authenticated session."""
    return pickle.dumps({'user_email': user_email, 'user_name': user_name, '_permanent': True})
