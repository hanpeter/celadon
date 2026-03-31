import json
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


# Bodies valid for from_dict (extra keys are ignored where applicable).
PURCHASER_BODY = {
    "name": "test",
    "purchaser_id": 1,
    "purchase_date": "2024-01-01",
    "cost": 10,
    "customer_id": 1,
    "items": [],
}
PURCHASE_BODY = {
    "name": "test",
    "purchaser_id": 1,
    "purchase_date": "2024-01-01",
    "cost": 10,
    "customer_id": 1,
    "items": [],
}
CUSTOMER_BODY = {
    "name": "test",
    "purchaser_id": 1,
    "purchase_date": "2024-01-01",
    "cost": 10,
    "customer_id": 1,
    "items": [],
}
SALE_BODY = {
    "name": "test",
    "purchaser_id": 1,
    "purchase_date": "2024-01-01",
    "cost": 10,
    "customer_id": 1,
    "items": [],
    "description": "sale",
    "sale_price_won": 100,
    "shipping_cost_dollar": 5.0,
    "sales_date": "2024-01-01T00:00:00+00:00",
}
ITEM_BODY = {
    "name": "test",
    "purchaser_id": 1,
    "purchase_date": "2024-01-01",
    "cost": 10,
    "customer_id": 1,
    "items": [],
    "brand": "brand",
    "quantity": 1,
}


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
    """Return a test client on the module server with a pre-authenticated session.

    Patches the session interface's DB so open_session returns a pre-authenticated
    session, without needing a real database or cookie manipulation.
    """
    sid = 'test-session-id'
    mock_db = MagicMock()
    mock_db.get_session.return_value = make_session_data()
    server_module.server.session_interface._db = mock_db
    client = server_module.server.test_client()
    client.set_cookie('session', sid)
    return client


class TestCreateConnection:
    def test_missing_database_url_raises(self):
        from celadon.server import _create_connection
        with patch.dict('os.environ', {}, clear=True):
            with pytest.raises(EnvironmentError, match='DATABASE_URL environment variable is not set'):
                _create_connection()


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
        expected = [{"id": 1, "name": "a", "is_active": True}]
        mock_app.get_purchasers.return_value = expected
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/purchaser")
        assert r.status_code == 200
        assert r.get_json() == expected
        mock_app.get_purchasers.assert_called_once_with()

    def test_post_valid_json(self, flask_client):
        _, mock_app = flask_client
        created = {"id": 2, "name": "test", "is_active": True}
        mock_app.add_purchaser.return_value = created
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "post", "/purchaser", PURCHASER_BODY)
        assert r.status_code == 201
        assert r.get_json() == created
        mock_app.add_purchaser.assert_called_once()
        arg = mock_app.add_purchaser.call_args[0][0]
        assert isinstance(arg, Purchaser)
        assert arg.name == "test"

    def test_get_one(self, flask_client):
        _, mock_app = flask_client
        expected = {"id": 1, "name": "x", "is_active": True}
        mock_app.get_purchaser.return_value = expected
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/purchaser/1")
        assert r.status_code == 200
        assert r.get_json() == expected
        mock_app.get_purchaser.assert_called_once_with(1)

    def test_put_one(self, flask_client):
        _, mock_app = flask_client
        updated = {"id": 1, "name": "test", "is_active": False}
        mock_app.update_purchaser.return_value = updated
        body = dict(PURCHASER_BODY)
        body["is_active"] = False
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "put", "/purchaser/1", body)
        assert r.status_code == 200
        assert r.get_json() == updated
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
        payload = r.get_json()
        assert payload == {"error": "Request body must be valid JSON"}
        mock_app.add_purchaser.assert_not_called()

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
        expected = [
            {
                "id": 1,
                "purchase_date": "2024-01-01",
                "cost": 10.0,
                "purchaser_id": 1,
                "purchaser_name": "p",
            }
        ]
        mock_app.get_purchases.return_value = expected
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/purchase")
        assert r.status_code == 200
        assert r.get_json() == expected
        mock_app.get_purchases.assert_called_once_with()

    def test_post_valid_json(self, flask_client):
        _, mock_app = flask_client
        created = {
            "id": 3,
            "purchase_date": "2024-01-01",
            "cost": 10.0,
            "purchaser_id": 1,
            "purchaser_name": "",
        }
        mock_app.add_purchase.return_value = created
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "post", "/purchase", PURCHASE_BODY)
        assert r.status_code == 201
        assert r.get_json() == created
        mock_app.add_purchase.assert_called_once()
        arg = mock_app.add_purchase.call_args[0][0]
        assert isinstance(arg, Purchase)
        assert arg.purchaser_id == 1

    def test_get_one(self, flask_client):
        _, mock_app = flask_client
        expected = {
            "id": 1,
            "purchase_date": "2024-01-01",
            "cost": 10.0,
            "purchaser_id": 1,
            "purchaser_name": "",
        }
        mock_app.get_purchase.return_value = expected
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/purchase/1")
        assert r.status_code == 200
        assert r.get_json() == expected
        mock_app.get_purchase.assert_called_once_with(1)

    def test_put_one(self, flask_client):
        _, mock_app = flask_client
        updated = {
            "id": 1,
            "purchase_date": "2024-01-01",
            "cost": 20.0,
            "purchaser_id": 1,
            "purchaser_name": "",
        }
        mock_app.update_purchase.return_value = updated
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "put", "/purchase/1", PURCHASE_BODY)
        assert r.status_code == 200
        assert r.get_json() == updated
        mock_app.update_purchase.assert_called_once()
        arg = mock_app.update_purchase.call_args[0][0]
        assert isinstance(arg, Purchase)
        assert arg.id == 1


class TestCustomerRoutes:
    def test_get_list(self, flask_client):
        _, mock_app = flask_client
        expected = [{"id": 1, "name": "c", "nickname": "", "cellular_phone_number": ""}]
        mock_app.get_customers.return_value = expected
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/customer")
        assert r.status_code == 200
        assert r.get_json() == expected
        mock_app.get_customers.assert_called_once_with()

    def test_post_valid_json(self, flask_client):
        _, mock_app = flask_client
        created = {"id": 2, "name": "test", "nickname": "", "cellular_phone_number": ""}
        mock_app.add_customer.return_value = created
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "post", "/customer", CUSTOMER_BODY)
        assert r.status_code == 201
        assert r.get_json() == created
        mock_app.add_customer.assert_called_once()
        arg = mock_app.add_customer.call_args[0][0]
        assert isinstance(arg, Customer)
        assert arg.name == "test"

    def test_get_one(self, flask_client):
        _, mock_app = flask_client
        expected = {"id": 1, "name": "c", "nickname": "n"}
        mock_app.get_customer.return_value = expected
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/customer/1")
        assert r.status_code == 200
        assert r.get_json() == expected
        mock_app.get_customer.assert_called_once_with(1)

    def test_put_one(self, flask_client):
        _, mock_app = flask_client
        updated = {"id": 1, "name": "test", "nickname": "nick"}
        mock_app.update_customer.return_value = updated
        body = dict(CUSTOMER_BODY)
        body["nickname"] = "nick"
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "put", "/customer/1", body)
        assert r.status_code == 200
        assert r.get_json() == updated
        mock_app.update_customer.assert_called_once()
        arg = mock_app.update_customer.call_args[0][0]
        assert isinstance(arg, Customer)
        assert arg.id == 1


class TestSaleRoutes:
    def test_get_list(self, flask_client):
        _, mock_app = flask_client
        expected = [
            {
                "id": 1,
                "customer_id": 1,
                "customer_name": "",
                "customer_nickname": "",
                "description": "",
                "sale_price_won": 1,
                "shipping_cost_dollar": 0.0,
                "sales_date": None,
                "paid_date": None,
                "shipped_date": None,
                "status": "SOLD",
            }
        ]
        mock_app.get_sales.return_value = expected
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/sale")
        assert r.status_code == 200
        assert r.get_json() == expected
        mock_app.get_sales.assert_called_once_with()

    def test_post_valid_json(self, flask_client):
        _, mock_app = flask_client
        created = {
            "id": 5,
            "customer_id": 1,
            "customer_name": "",
            "customer_nickname": "",
            "description": "sale",
            "sale_price_won": 100,
            "shipping_cost_dollar": 5.0,
            "sales_date": "2024-01-01T00:00:00+0000",
            "paid_date": None,
            "shipped_date": None,
            "status": "SOLD",
        }
        mock_app.add_sale.return_value = created
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "post", "/sale", SALE_BODY)
        assert r.status_code == 201
        assert r.get_json() == created
        mock_app.add_sale.assert_called_once()
        arg = mock_app.add_sale.call_args[0][0]
        assert isinstance(arg, Sale)
        assert arg.customer_id == 1

    def test_get_one(self, flask_client):
        _, mock_app = flask_client
        expected = {
            "id": 1,
            "customer_id": 1,
            "customer_name": "",
            "customer_nickname": "",
            "description": "x",
            "sale_price_won": 1,
            "shipping_cost_dollar": None,
            "sales_date": None,
            "paid_date": None,
            "shipped_date": None,
            "status": "SOLD",
        }
        mock_app.get_sale.return_value = expected
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/sale/1")
        assert r.status_code == 200
        assert r.get_json() == expected
        mock_app.get_sale.assert_called_once_with(1)

    def test_put_one(self, flask_client):
        _, mock_app = flask_client
        updated = {
            "id": 1,
            "customer_id": 1,
            "customer_name": "",
            "customer_nickname": "",
            "description": "sale",
            "sale_price_won": 100,
            "shipping_cost_dollar": 5.0,
            "sales_date": "2024-01-01T00:00:00+0000",
            "paid_date": None,
            "shipped_date": None,
            "status": "SOLD",
        }
        mock_app.update_sale.return_value = updated
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "put", "/sale/1", SALE_BODY)
        assert r.status_code == 200
        assert r.get_json() == updated
        mock_app.update_sale.assert_called_once()
        arg = mock_app.update_sale.call_args[0][0]
        assert isinstance(arg, Sale)
        assert arg.id == 1


class TestItemRoutes:
    def test_get_list(self, flask_client):
        _, mock_app = flask_client
        expected = [{"id": 1, "brand": "b", "name": "n", "quantity": 1, "cost": 1.0}]
        mock_app.get_items.return_value = expected
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/item")
        assert r.status_code == 200
        assert r.get_json() == expected
        mock_app.get_items.assert_called_once_with()

    def test_get_one(self, flask_client):
        _, mock_app = flask_client
        expected = {"id": 1, "brand": "b", "name": "n", "quantity": 2, "cost": 3.0}
        mock_app.get_item.return_value = expected
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = client.get("/item/1")
        assert r.status_code == 200
        assert r.get_json() == expected
        mock_app.get_item.assert_called_once_with(1)

    def test_put_one(self, flask_client):
        _, mock_app = flask_client
        updated = {"id": 1, "brand": "brand", "name": "test", "quantity": 1, "cost": 10.0}
        mock_app.update_item.return_value = updated
        with patch("celadon.server.server.app", mock_app):
            with _authed_client() as client:
                r = _json_post_put(client, "put", "/item/1", ITEM_BODY)
        assert r.status_code == 200
        assert r.get_json() == updated
        mock_app.update_item.assert_called_once()
        arg = mock_app.update_item.call_args[0][0]
        assert isinstance(arg, Item)
        assert arg.id == 1
