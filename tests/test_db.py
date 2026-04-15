import pytest
from datetime import date
from unittest.mock import MagicMock, call, patch
from celadon.models import Customer, Item, Purchase, Purchaser, Sale


def _make_cursor(rows=None, fetchone_value=None):
    cur = MagicMock()
    cur.__enter__ = lambda s: s
    cur.__exit__ = MagicMock(return_value=False)
    cur.__iter__ = lambda s: iter(rows or [])
    if fetchone_value is not None:
        cur.fetchone.return_value = (fetchone_value,)
    return cur


class TestPurchaser:
    def test_get_purchasers(self, db_instance, mock_conn):
        row = {'id': 1, 'name': 'Eunjin', 'is_active': True}
        cur = _make_cursor(rows=[row])
        mock_conn.cursor.return_value = cur
        result = db_instance.get_purchasers()
        cur.execute.assert_called_once_with(Purchaser.SELECT_ALL)
        assert len(result) == 1
        assert isinstance(result[0], Purchaser)
        assert result[0].id == 1

    def test_get_purchaser(self, db_instance, mock_conn):
        row = {'id': 2, 'name': 'Hyojin', 'is_active': True}
        cur = _make_cursor(rows=[row])
        cur.fetchone.return_value = row
        mock_conn.cursor.return_value = cur
        result = db_instance.get_purchaser(2)
        cur.execute.assert_called_once_with(Purchaser.SELECT_ONE, [2])
        assert isinstance(result, Purchaser)
        assert result.name == 'Hyojin'

    def test_get_purchaser_not_found(self, db_instance, mock_conn):
        cur = _make_cursor()
        cur.fetchone.return_value = None
        mock_conn.cursor.return_value = cur
        result = db_instance.get_purchaser(99)
        assert result is None

    def test_add_purchaser(self, db_instance, mock_conn):
        purchaser = Purchaser(id=None, name='New', is_active=True)
        cur = _make_cursor(fetchone_value=10)
        mock_conn.cursor.return_value = cur
        result = db_instance.add_purchaser(purchaser)
        cur.execute.assert_called_once_with(Purchaser.INSERT, purchaser.model_dump())
        assert result == 10

    def test_update_purchaser(self, db_instance, mock_conn):
        purchaser = Purchaser(id=1, name='Updated', is_active=False)
        cur = _make_cursor()
        mock_conn.cursor.return_value = cur
        db_instance.update_purchaser(purchaser)
        cur.execute.assert_called_once_with(Purchaser.UPDATE, purchaser.model_dump())


class TestPurchase:
    def _make_row(self):
        return {'id': 1, 'purchase_date': date(2024, 1, 1), 'cost': 100.0,
                'purchaser_id': 1, 'purchaser_name': 'Eunjin'}

    def test_get_purchases(self, db_instance, mock_conn):
        cur = _make_cursor(rows=[self._make_row()])
        mock_conn.cursor.return_value = cur
        result = db_instance.get_purchases()
        cur.execute.assert_called_once_with(Purchase.SELECT_ALL)
        assert len(result) == 1
        assert isinstance(result[0], Purchase)

    def test_get_purchase(self, db_instance, mock_conn):
        row = self._make_row()
        cur = _make_cursor(rows=[row])
        cur.fetchone.return_value = row
        mock_conn.cursor.return_value = cur
        result = db_instance.get_purchase(1)
        cur.execute.assert_called_once_with(Purchase.SELECT_ONE, [1])
        assert isinstance(result, Purchase)
        assert result.id == 1

    def test_get_purchase_not_found(self, db_instance, mock_conn):
        cur = _make_cursor()
        cur.fetchone.return_value = None
        mock_conn.cursor.return_value = cur
        result = db_instance.get_purchase(99)
        assert result is None

    def test_add_purchase(self, db_instance, mock_conn):
        purchase = Purchase(id=None, purchase_date=date(2024, 1, 1), cost=100.0,
                            purchaser_id=1, purchaser_name='')
        cur = _make_cursor(fetchone_value=5)
        mock_conn.cursor.return_value = cur
        result = db_instance.add_purchase(purchase)
        cur.execute.assert_called_once_with(Purchase.INSERT, purchase.model_dump())
        assert result == 5

    def test_update_purchase(self, db_instance, mock_conn):
        purchase = Purchase(id=1, purchase_date=date(2024, 1, 1), cost=100.0,
                            purchaser_id=1, purchaser_name='')
        cur = _make_cursor()
        mock_conn.cursor.return_value = cur
        db_instance.update_purchase(purchase)
        cur.execute.assert_called_once_with(Purchase.UPDATE, purchase.model_dump())


class TestItem:
    def _make_row(self):
        return {'id': 1, 'brand': 'Nike', 'name': 'Shoes', 'quantity': 2, 'cost': 99.99}

    def test_get_items(self, db_instance, mock_conn):
        cur = _make_cursor(rows=[self._make_row()])
        mock_conn.cursor.return_value = cur
        result = db_instance.get_items()
        cur.execute.assert_called_once_with(Item.SELECT_ALL)
        assert isinstance(result[0], Item)

    def test_get_item(self, db_instance, mock_conn):
        row = self._make_row()
        cur = _make_cursor(rows=[row])
        cur.fetchone.return_value = row
        mock_conn.cursor.return_value = cur
        result = db_instance.get_item(1)
        cur.execute.assert_called_once_with(Item.SELECT_ONE, [1])
        assert isinstance(result, Item)
        assert result.brand == 'Nike'

    def test_get_item_not_found(self, db_instance, mock_conn):
        cur = _make_cursor()
        cur.fetchone.return_value = None
        mock_conn.cursor.return_value = cur
        result = db_instance.get_item(99)
        assert result is None

    def test_add_item(self, db_instance, mock_conn):
        item = Item(id=None, brand='Adidas', name='Hat', quantity=1, cost=25.0)
        cur = _make_cursor(fetchone_value=7)
        mock_conn.cursor.return_value = cur
        result = db_instance.add_item(item)
        cur.execute.assert_called_once_with(Item.INSERT, item.model_dump())
        assert result == 7

    def test_update_item(self, db_instance, mock_conn):
        item = Item(id=1, brand='Adidas', name='Hat', quantity=3, cost=30.0)
        cur = _make_cursor()
        mock_conn.cursor.return_value = cur
        db_instance.update_item(item)
        cur.execute.assert_called_once_with(Item.UPDATE, item.model_dump())


class TestCustomer:
    def _make_row(self):
        return {'id': 1, 'name': 'Alice', 'nickname': 'ali',
                'phone_number': '010-1234-5678', 'address': '123 Main St',
                'postal_code': '12345', 'personal_customs_clearance_code': 'P123'}

    def test_get_customers(self, db_instance, mock_conn):
        cur = _make_cursor(rows=[self._make_row()])
        mock_conn.cursor.return_value = cur
        result = db_instance.get_customers()
        cur.execute.assert_called_once_with(Customer.SELECT_ALL)
        assert isinstance(result[0], Customer)

    def test_get_customer(self, db_instance, mock_conn):
        row = self._make_row()
        cur = _make_cursor(rows=[row])
        cur.fetchone.return_value = row
        mock_conn.cursor.return_value = cur
        result = db_instance.get_customer(1)
        cur.execute.assert_called_once_with(Customer.SELECT_ONE, [1])
        assert isinstance(result, Customer)
        assert result.name == 'Alice'

    def test_get_customer_not_found(self, db_instance, mock_conn):
        cur = _make_cursor()
        cur.fetchone.return_value = None
        mock_conn.cursor.return_value = cur
        result = db_instance.get_customer(99)
        assert result is None

    def test_add_customer(self, db_instance, mock_conn):
        customer = Customer(id=None, name='Bob', nickname='bobby',
                            phone_number='010-9999-8888', address='456 Elm St',
                            postal_code='67890', personal_customs_clearance_code='P456')
        cur = _make_cursor(fetchone_value=3)
        mock_conn.cursor.return_value = cur
        result = db_instance.add_customer(customer)
        cur.execute.assert_called_once_with(Customer.INSERT, customer.model_dump())
        assert result == 3

    def test_update_customer(self, db_instance, mock_conn):
        customer = Customer(id=1, name='Bob', nickname='bobby',
                            phone_number='010-9999-8888', address='456 Elm St',
                            postal_code='67890', personal_customs_clearance_code='P456')
        cur = _make_cursor()
        mock_conn.cursor.return_value = cur
        db_instance.update_customer(customer)
        cur.execute.assert_called_once_with(Customer.UPDATE, customer.model_dump())


class TestSale:
    def _make_row(self):
        from datetime import date
        return {
            'id': 1, 'customer_id': 3, 'description': 'Jacket',
            'sale_price_won': 120000, 'shipping_cost_dollar': 15.0,
            'sales_date': date(2024, 2, 1),
            'paid_date': None, 'shipped_date': None,
            'customer_name': 'Bob', 'customer_nickname': 'bobby',
        }

    def test_get_sales(self, db_instance, mock_conn):
        cur = _make_cursor(rows=[self._make_row()])
        mock_conn.cursor.return_value = cur
        result = db_instance.get_sales()
        cur.execute.assert_called_once_with(Sale.SELECT_ALL)
        assert isinstance(result[0], Sale)

    def test_get_sale(self, db_instance, mock_conn):
        row = self._make_row()
        cur = _make_cursor(rows=[row])
        cur.fetchone.return_value = row
        mock_conn.cursor.return_value = cur
        result = db_instance.get_sale(1)
        cur.execute.assert_called_once_with(Sale.SELECT_ONE, [1])
        assert isinstance(result, Sale)
        assert result.customer_id == 3

    def test_get_sale_not_found(self, db_instance, mock_conn):
        cur = _make_cursor()
        cur.fetchone.return_value = None
        mock_conn.cursor.return_value = cur
        result = db_instance.get_sale(99)
        assert result is None

    def test_add_sale(self, db_instance, mock_conn):
        sale = Sale.model_validate({'customer_id': 3, 'description': 'Jacket'})
        cur = _make_cursor(fetchone_value=20)
        mock_conn.cursor.return_value = cur
        result = db_instance.add_sale(sale)
        cur.execute.assert_called_once_with(Sale.INSERT, sale.model_dump(exclude={'status'}))
        assert result == 20

    def test_update_sale(self, db_instance, mock_conn):
        sale = Sale.model_validate({'id': 1, 'customer_id': 3, 'description': 'Jacket'})
        cur = _make_cursor()
        mock_conn.cursor.return_value = cur
        db_instance.update_sale(sale)
        cur.execute.assert_called_once_with(Sale.UPDATE, sale.model_dump(exclude={'status'}))

    def test_delete_sale(self, db_instance, mock_conn):
        cur = _make_cursor()
        mock_conn.cursor.return_value = cur
        db_instance.delete_sale(1)
        cur.execute.assert_called_once_with(Sale.DELETE, [1])


class TestSession:
    def test_get_session_returns_data_when_found(self, db_instance, mock_conn):
        raw = b'pickled-data'
        cur = _make_cursor()
        cur.fetchone.return_value = (raw,)
        mock_conn.cursor.return_value = cur
        result = db_instance.get_session('test-sid')
        assert cur.execute.call_args[0][1] == ['test-sid']
        assert result == raw

    def test_get_session_returns_none_when_not_found(self, db_instance, mock_conn):
        cur = _make_cursor()
        cur.fetchone.return_value = None
        mock_conn.cursor.return_value = cur
        result = db_instance.get_session('missing-sid')
        assert result is None

    def test_upsert_session(self, db_instance, mock_conn):
        from datetime import datetime, timezone
        expiry = datetime(2026, 1, 1, tzinfo=timezone.utc)
        cur = _make_cursor()
        mock_conn.cursor.return_value = cur
        db_instance.upsert_session('test-sid', b'data', expiry)
        args = cur.execute.call_args[0][1]
        assert args == ['test-sid', b'data', expiry]

    def test_delete_session(self, db_instance, mock_conn):
        cur = _make_cursor()
        mock_conn.cursor.return_value = cur
        db_instance.delete_session('test-sid')
        cur.execute.assert_called_once_with(
            'DELETE FROM sessions WHERE id = %s', ['test-sid']
        )


class TestTransaction:
    def test_transaction_yields_connection(self, db_instance, mock_pool, mock_conn):
        with db_instance.transaction() as conn:
            assert conn is mock_conn

    def test_transaction_commits_on_success(self, db_instance, mock_pool):
        with db_instance.transaction():
            pass
        mock_pool.connection.return_value.__exit__.assert_called_once()

    def test_transaction_rolls_back_on_exception(self, db_instance, mock_pool):
        mock_pool.connection.return_value.__exit__.return_value = False
        with pytest.raises(ValueError):
            with db_instance.transaction():
                raise ValueError('boom')
        mock_pool.connection.return_value.__exit__.assert_called_once()
