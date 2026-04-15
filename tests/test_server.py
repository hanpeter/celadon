import json
from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from werkzeug.exceptions import NotFound

import celadon.server as server_module
from celadon.models.customer import Customer
from celadon.models.item import Item
from celadon.models.purchaser import Purchaser
from celadon.models.purchase import Purchase
from celadon.models.sale import Sale
from tests.conftest import make_session_data


PURCHASER_BODY = {"name": "test", "is_active": True}
PURCHASE_BODY = {
    "purchaser_id": 1,
    "purchase_date": "2024-01-01",
    "cost": 10,
    "items": [],
}
CUSTOMER_BODY = {"name": "test"}
SALE_BODY = {
    "customer_id": 1,
    "description": "sale",
    "sale_price_won": 100,
    "shipping_cost_dollar": 5.0,
    "sales_date": "2024-01-01",
}
ITEM_BODY = {"brand": "brand", "name": "test", "quantity": 1, "cost": 10}


def _json_post_put(client, method, path, body):
    data = json.dumps(body)
    if method == "post":
        return client.post(path, data=data, content_type="application/json")
    return client.put(path, data=data, content_type="application/json")


@pytest.fixture(autouse=True)
def _server_testing():
    mock_db = MagicMock()
    mock_db.get_session.return_value = None
    server_module.server.config["TESTING"] = True
    server_module.server.session_interface._db = mock_db
    yield


def _authed_client():
    """Return a test client on the module server with a pre-authenticated session."""
    sid = 'test-session-id'
    mock_db = MagicMock()
    mock_db.get_session.return_value = make_session_data()
    server_module.server.session_interface._db = mock_db
    client = server_module.server.test_client()
    client.set_cookie('session', sid)
    return client


class TestCreatePool:
    def test_missing_database_url_raises(self):
        from celadon.server import _create_pool
        with patch.dict('os.environ', {}, clear=True):
            with pytest.raises(EnvironmentError, match='DATABASE_URL environment variable is not set'):
                _create_pool()

    def test_connection_error_raises_runtime_error(self):
        import psycopg
        from celadon.server import _create_pool
        with patch.dict('os.environ', {'DATABASE_URL': 'postgresql://bad/db'}):
            with patch('celadon.server.ConnectionPool', side_effect=psycopg.OperationalError('refused')):
                with pytest.raises(RuntimeError, match='Failed to connect to database'):
                    _create_pool()

    def test_non_operational_psycopg_error_raises_runtime_error(self):
        import psycopg
        from celadon.server import _create_pool
        with patch.dict('os.environ', {'DATABASE_URL': 'postgresql://bad/db'}):
            with patch('celadon.server.ConnectionPool', side_effect=psycopg.InterfaceError('bad state')):
                with pytest.raises(RuntimeError, match='Failed to connect to database'):
                    _create_pool()


class TestIndex:
    def test_get_root_unauthenticated_redirects_to_login(self):
        with server_module.server.test_client() as client:
            r = client.get("/")
        assert r.status_code == 302
        assert "/login" in r.headers["Location"]

    def test_get_root_authenticated_returns_html(self):
        with _authed_client() as client:
            r = client.get("/")
        assert r.status_code == 200
        assert b"<!DOCTYPE html>" in r.data or b"<html" in r.data


class TestPurchaserRoutes:
    def test_get_list(self, flask_client):
        _, mock_app = flask_client
        models = [Purchaser(id=1, name='a', is_active=True)]
        mock_app.get_purchasers.return_value = models
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/purchaser")
        assert r.status_code == 200
        assert r.get_json() == [{"id": 1, "name": "a", "is_active": True}]
        mock_app.get_purchasers.assert_called_once_with()

    def test_post_valid_json(self, flask_client):
        _, mock_app = flask_client
        mock_app.add_purchaser.return_value = Purchaser(id=2, name='test', is_active=True)
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "post", "/purchaser", PURCHASER_BODY)
        assert r.status_code == 201
        assert r.get_json() == {"id": 2, "name": "test", "is_active": True}
        mock_app.add_purchaser.assert_called_once()
        arg = mock_app.add_purchaser.call_args[0][0]
        assert isinstance(arg, Purchaser)
        assert arg.name == "test"

    def test_get_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.get_purchaser.return_value = Purchaser(id=1, name='x', is_active=True)
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/purchaser/1")
        assert r.status_code == 200
        assert r.get_json()["id"] == 1
        mock_app.get_purchaser.assert_called_once_with(1)

    def test_put_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.update_purchaser.return_value = Purchaser(id=1, name='test', is_active=False)
        body = dict(PURCHASER_BODY)
        body["is_active"] = False
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "put", "/purchaser/1", body)
        assert r.status_code == 200
        assert r.get_json() == {"id": 1, "name": "test", "is_active": False}
        mock_app.update_purchaser.assert_called_once()
        arg = mock_app.update_purchaser.call_args[0][0]
        assert isinstance(arg, Purchaser)
        assert arg.id == 1
        assert arg.is_active is False

    def test_post_invalid_json_returns_400(self, flask_client):
        _, mock_app = flask_client
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.post(
                    "/purchaser",
                    data="not valid json",
                    content_type="application/json",
                )
        assert r.status_code == 400
        assert r.get_json() == {"error": "Request body must be valid JSON"}
        mock_app.add_purchaser.assert_not_called()

    def test_post_validation_error_returns_422(self, flask_client):
        _, mock_app = flask_client
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "post", "/sale", {})
        assert r.status_code == 422
        payload = r.get_json()
        assert "error" in payload
        mock_app.add_sale.assert_not_called()

    def test_get_one_not_found(self, flask_client):
        _, mock_app = flask_client
        mock_app.get_purchaser.side_effect = NotFound(description="gone")
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/purchaser/1")
        assert r.status_code == 404
        assert r.get_json() == {"error": "gone"}


class TestPurchaseRoutes:
    def test_get_list(self, flask_client):
        _, mock_app = flask_client
        models = [Purchase(id=1, purchase_date=date(2024, 1, 1), cost=10.0,
                           purchaser_id=1, purchaser_name='p')]
        mock_app.get_purchases.return_value = models
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/purchase")
        assert r.status_code == 200
        data = r.get_json()
        assert data[0]["purchase_date"] == "2024-01-01"
        mock_app.get_purchases.assert_called_once_with()

    def test_post_valid_json(self, flask_client):
        _, mock_app = flask_client
        mock_app.add_purchase.return_value = Purchase(
            id=3, purchase_date=date(2024, 1, 1), cost=10.0,
            purchaser_id=1, purchaser_name='')
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "post", "/purchase", PURCHASE_BODY)
        assert r.status_code == 201
        assert r.get_json()["id"] == 3
        mock_app.add_purchase.assert_called_once()
        arg = mock_app.add_purchase.call_args[0][0]
        assert isinstance(arg, Purchase)
        assert arg.purchaser_id == 1

    def test_get_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.get_purchase.return_value = Purchase(
            id=1, purchase_date=date(2024, 1, 1), cost=10.0,
            purchaser_id=1, purchaser_name='')
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/purchase/1")
        assert r.status_code == 200
        assert r.get_json()["id"] == 1
        mock_app.get_purchase.assert_called_once_with(1)

    def test_put_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.update_purchase.return_value = Purchase(
            id=1, purchase_date=date(2024, 1, 1), cost=20.0,
            purchaser_id=1, purchaser_name='')
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "put", "/purchase/1", PURCHASE_BODY)
        assert r.status_code == 200
        assert r.get_json()["id"] == 1
        mock_app.update_purchase.assert_called_once()
        arg = mock_app.update_purchase.call_args[0][0]
        assert isinstance(arg, Purchase)
        assert arg.id == 1


class TestCustomerRoutes:
    def test_get_list(self, flask_client):
        _, mock_app = flask_client
        models = [Customer(id=1, name='c')]
        mock_app.get_customers.return_value = models
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/customer")
        assert r.status_code == 200
        assert r.get_json()[0]["id"] == 1
        mock_app.get_customers.assert_called_once_with()

    def test_post_valid_json(self, flask_client):
        _, mock_app = flask_client
        mock_app.add_customer.return_value = Customer(id=2, name='test')
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "post", "/customer", CUSTOMER_BODY)
        assert r.status_code == 201
        assert r.get_json()["name"] == "test"
        mock_app.add_customer.assert_called_once()
        arg = mock_app.add_customer.call_args[0][0]
        assert isinstance(arg, Customer)
        assert arg.name == "test"

    def test_get_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.get_customer.return_value = Customer(id=1, name='c', nickname='n')
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/customer/1")
        assert r.status_code == 200
        assert r.get_json()["id"] == 1
        mock_app.get_customer.assert_called_once_with(1)

    def test_put_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.update_customer.return_value = Customer(id=1, name='test', nickname='nick')
        body = dict(CUSTOMER_BODY)
        body["nickname"] = "nick"
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "put", "/customer/1", body)
        assert r.status_code == 200
        mock_app.update_customer.assert_called_once()
        arg = mock_app.update_customer.call_args[0][0]
        assert isinstance(arg, Customer)
        assert arg.id == 1


class TestSaleRoutes:
    def _sale_model(self, id=1, customer_id=1, **kwargs):
        return Sale(id=id, customer_id=customer_id, **kwargs)

    def test_get_list(self, flask_client):
        _, mock_app = flask_client
        models = [self._sale_model(sale_price_won=1)]
        mock_app.get_sales.return_value = models
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/sale")
        assert r.status_code == 200
        data = r.get_json()
        assert data[0]["status"] == "SOLD"
        mock_app.get_sales.assert_called_once_with()

    def test_post_valid_json(self, flask_client):
        _, mock_app = flask_client
        mock_app.add_sale.return_value = self._sale_model(
            id=5, sales_date=date(2024, 1, 1), description='sale',
            sale_price_won=100, shipping_cost_dollar=5.0)
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "post", "/sale", SALE_BODY)
        assert r.status_code == 201
        data = r.get_json()
        assert data["id"] == 5
        assert data["sales_date"] == "2024-01-01"
        mock_app.add_sale.assert_called_once()
        arg = mock_app.add_sale.call_args[0][0]
        assert isinstance(arg, Sale)
        assert arg.customer_id == 1

    def test_get_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.get_sale.return_value = self._sale_model(description='x', sale_price_won=1)
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/sale/1")
        assert r.status_code == 200
        assert r.get_json()["customer_id"] == 1
        mock_app.get_sale.assert_called_once_with(1)

    def test_put_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.update_sale.return_value = self._sale_model(
            id=1, sales_date=date(2024, 1, 1), description='sale',
            sale_price_won=100, shipping_cost_dollar=5.0)
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "put", "/sale/1", SALE_BODY)
        assert r.status_code == 200
        assert r.get_json()["id"] == 1
        mock_app.update_sale.assert_called_once()
        arg = mock_app.update_sale.call_args[0][0]
        assert isinstance(arg, Sale)
        assert arg.id == 1

    def test_delete_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.delete_sale.return_value = None
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.delete("/sale/1")
        assert r.status_code == 204
        assert r.data == b''
        mock_app.delete_sale.assert_called_once_with(1)

    def test_delete_one_not_found(self, flask_client):
        _, mock_app = flask_client
        mock_app.delete_sale.side_effect = NotFound(description="Sale 99 not found")
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.delete("/sale/99")
        assert r.status_code == 404
        assert r.get_json() == {"error": "Sale 99 not found"}


class TestItemRoutes:
    def test_get_list(self, flask_client):
        _, mock_app = flask_client
        models = [Item(id=1, brand='b', name='n', quantity=1, cost=1.0)]
        mock_app.get_items.return_value = models
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/item")
        assert r.status_code == 200
        assert r.get_json()[0]["brand"] == "b"
        mock_app.get_items.assert_called_once_with()

    def test_get_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.get_item.return_value = Item(id=1, brand='b', name='n', quantity=2, cost=3.0)
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/item/1")
        assert r.status_code == 200
        assert r.get_json()["id"] == 1
        mock_app.get_item.assert_called_once_with(1)

    def test_put_one(self, flask_client):
        _, mock_app = flask_client
        mock_app.update_item.return_value = Item(id=1, brand='brand', name='test',
                                                 quantity=1, cost=10.0)
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "put", "/item/1", ITEM_BODY)
        assert r.status_code == 200
        assert r.get_json()["id"] == 1
        mock_app.update_item.assert_called_once()
        arg = mock_app.update_item.call_args[0][0]
        assert isinstance(arg, Item)
        assert arg.id == 1
