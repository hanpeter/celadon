import os
import pytest
from unittest.mock import MagicMock, patch
from celadon.application import Application
from celadon.db import Database

os.environ.setdefault('DATABASE_URL', 'postgresql://test:test@localhost/test')

with patch('psycopg2.connect', return_value=MagicMock()):
    from celadon.server import create_server


@pytest.fixture
def mock_conn():
    return MagicMock()


@pytest.fixture
def db_instance(mock_conn):
    return Database(connection=mock_conn)


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def mock_app():
    return MagicMock(spec=Application)


@pytest.fixture
def app_instance(mock_db):
    return Application(mock_db)


@pytest.fixture
def flask_client(mock_app):
    srv = create_server(application=mock_app)
    srv.config['TESTING'] = True
    with srv.test_client() as client:
        yield client, mock_app
