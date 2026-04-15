import pytest
from datetime import date, datetime, timezone
from pydantic import ValidationError
from celadon.models.customer import Customer
from celadon.models.item import Item
from celadon.models.purchaser import Purchaser
from celadon.models.purchase import Purchase
from celadon.models.sale import Sale, SaleStatus


class TestCustomer:
    def test_model_validate_full(self):
        d = {
            'id': 1,
            'name': 'Alice',
            'nickname': 'ali',
            'phone_number': '010-1234-5678',
            'address': '123 Main St',
            'postal_code': '12345',
            'personal_customs_clearance_code': 'P123456789',
        }
        c = Customer.model_validate(d)
        assert c.id == 1
        assert c.name == 'Alice'
        assert c.nickname == 'ali'
        assert c.phone_number == '010-1234-5678'
        assert c.address == '123 Main St'
        assert c.postal_code == '12345'
        assert c.personal_customs_clearance_code == 'P123456789'

    def test_model_validate_defaults(self):
        c = Customer.model_validate({})
        assert c.id is None
        assert c.name == ''
        assert c.nickname == ''
        assert c.phone_number == ''
        assert c.address == ''
        assert c.postal_code == ''
        assert c.personal_customs_clearance_code == ''

    def test_model_dump_roundtrip(self):
        d = {
            'id': 2,
            'name': 'Bob',
            'nickname': 'bobby',
            'phone_number': '010-9999-8888',
            'address': '456 Elm St',
            'postal_code': '67890',
            'personal_customs_clearance_code': 'P987654321',
        }
        assert Customer.model_validate(d).model_dump(mode='json') == d


class TestItem:
    def test_model_validate_full(self):
        d = {'id': 10, 'brand': 'Nike', 'name': 'Shoes', 'quantity': 2, 'cost': 99.99}
        item = Item.model_validate(d)
        assert item.id == 10
        assert item.brand == 'Nike'
        assert item.name == 'Shoes'
        assert item.quantity == 2
        assert item.cost == 99.99

    def test_cost_coerced_to_float(self):
        item = Item.model_validate({'id': 1, 'brand': 'X', 'name': 'Y', 'quantity': 1, 'cost': '49'})
        assert isinstance(item.cost, float)
        assert item.cost == 49.0

    def test_model_validate_defaults(self):
        item = Item.model_validate({})
        assert item.id is None
        assert item.brand == ''
        assert item.name == ''
        assert item.quantity == 0
        assert item.cost == 0.0

    def test_model_dump_roundtrip(self):
        d = {'id': 5, 'brand': 'Adidas', 'name': 'Hat', 'quantity': 3, 'cost': 25.0}
        assert Item.model_validate(d).model_dump(mode='json') == d


class TestPurchaser:
    def test_model_validate_full(self):
        p = Purchaser.model_validate({'id': 1, 'name': 'Warehouse A', 'is_active': False})
        assert p.id == 1
        assert p.name == 'Warehouse A'
        assert p.is_active is False

    def test_is_active_defaults_to_true(self):
        p = Purchaser.model_validate({'id': 1, 'name': 'X'})
        assert p.is_active is True

    def test_model_validate_defaults(self):
        p = Purchaser.model_validate({})
        assert p.id is None
        assert p.name == ''
        assert p.is_active is True

    def test_model_dump_roundtrip(self):
        d = {'id': 3, 'name': 'Depot', 'is_active': False}
        assert Purchaser.model_validate(d).model_dump(mode='json') == d


class TestPurchase:
    def test_model_validate_full(self):
        d = {
            'id': 1,
            'purchase_date': '2024-01-15',
            'cost': 150.0,
            'purchaser_id': 2,
            'items': [],
        }
        p = Purchase.model_validate(d)
        assert p.id == 1
        assert p.purchase_date == date(2024, 1, 15)
        assert p.cost == 150.0
        assert p.purchaser_id == 2
        assert p.purchaser_name == ''
        assert p.items == []

    def test_cost_coerced_to_float(self):
        d = {'purchase_date': '2024-03-01', 'cost': '200', 'purchaser_id': 1}
        p = Purchase.model_validate(d)
        assert isinstance(p.cost, float)

    def test_missing_purchaser_id_raises(self):
        with pytest.raises(ValidationError):
            Purchase.model_validate({'purchase_date': '2024-01-01', 'cost': 10})

    def test_nested_items_parsed(self):
        d = {
            'purchase_date': '2024-06-01',
            'cost': 50.0,
            'purchaser_id': 1,
            'items': [
                {'id': 1, 'brand': 'Nike', 'name': 'Shoes', 'quantity': 1, 'cost': 50.0}
            ],
        }
        p = Purchase.model_validate(d)
        assert len(p.items) == 1
        assert p.items[0].brand == 'Nike'

    def test_model_dump_date_format(self):
        d = {'id': 7, 'purchase_date': '2024-08-20', 'cost': 300.0, 'purchaser_id': 3}
        result = Purchase.model_validate(d).model_dump(mode='json')
        assert result['purchase_date'] == '2024-08-20'
        assert result['cost'] == 300.0

    def test_strip_time_from_datetime(self):
        dt = datetime(2024, 5, 10, 14, 30, 0, tzinfo=timezone.utc)
        p = Purchase.model_validate({'purchase_date': dt, 'purchaser_id': 1})
        assert p.purchase_date == date(2024, 5, 10)


class TestSale:
    def test_model_validate_full(self):
        d = {
            'id': 5,
            'customer_id': 3,
            'description': 'Jacket',
            'sale_price_won': 120000,
            'shipping_cost_dollar': 15.0,
            'sales_date': '2024-02-01',
            'paid_date': None,
            'shipped_date': None,
            'customer_name': 'Bob',
            'customer_nickname': 'bobby',
        }
        sale = Sale.model_validate(d)
        assert sale.id == 5
        assert sale.customer_id == 3
        assert sale.description == 'Jacket'
        assert sale.sale_price_won == 120000
        assert sale.shipping_cost_dollar == 15.0
        assert sale.sales_date == date(2024, 2, 1)
        assert sale.paid_date is None
        assert sale.shipped_date is None
        assert sale.customer_name == 'Bob'
        assert sale.customer_nickname == 'bobby'
        assert sale.status == SaleStatus.SOLD

    def test_strip_time_from_datetime_values(self):
        sales_date = datetime(2024, 3, 1, 9, 0, 0, tzinfo=timezone.utc)
        paid_date = datetime(2024, 3, 2, 10, 0, 0, tzinfo=timezone.utc)
        sale = Sale.model_validate({
            'customer_id': 1,
            'sales_date': sales_date,
            'paid_date': paid_date,
        })
        assert sale.sales_date == date(2024, 3, 1)
        assert sale.paid_date == date(2024, 3, 2)

    def test_missing_customer_id_raises(self):
        with pytest.raises(ValidationError):
            Sale.model_validate({'description': 'x'})

    def test_sale_price_coerced_to_int(self):
        sale = Sale.model_validate({
            'customer_id': 1, 'sale_price_won': '50000',
        })
        assert isinstance(sale.sale_price_won, int)
        assert sale.sale_price_won == 50000

    def test_shipping_cost_coerced_to_float(self):
        sale = Sale.model_validate({
            'customer_id': 1, 'shipping_cost_dollar': '9.99',
        })
        assert isinstance(sale.shipping_cost_dollar, float)
        assert sale.shipping_cost_dollar == 9.99

    def test_model_dump_status_sold(self):
        sale = Sale.model_validate({'customer_id': 1})
        d = sale.model_dump(mode='json')
        assert d['status'] == 'SOLD'
        assert d['paid_date'] is None
        assert d['shipped_date'] is None

    def test_model_dump_status_paid(self):
        sale = Sale.model_validate({'customer_id': 1, 'paid_date': '2024-01-02'})
        d = sale.model_dump(mode='json')
        assert d['status'] == 'PAID'
        assert d['paid_date'] == '2024-01-02'

    def test_model_dump_status_shipped(self):
        sale = Sale.model_validate({
            'customer_id': 1,
            'paid_date': '2024-01-02',
            'shipped_date': '2024-01-03',
        })
        d = sale.model_dump(mode='json')
        assert d['status'] == 'SHIPPED'
        assert d['shipped_date'] == '2024-01-03'

    def test_model_dump_full(self):
        sale = Sale.model_validate({
            'id': 5,
            'customer_id': 3,
            'description': 'Jacket',
            'sale_price_won': 120000,
            'shipping_cost_dollar': 15.0,
            'sales_date': '2024-02-01',
            'paid_date': None,
            'shipped_date': None,
            'customer_name': 'Bob',
            'customer_nickname': 'bobby',
        })
        d = sale.model_dump(mode='json')
        assert d['id'] == 5
        assert d['customer_id'] == 3
        assert d['customer_name'] == 'Bob'
        assert d['customer_nickname'] == 'bobby'
        assert d['description'] == 'Jacket'
        assert d['sale_price_won'] == 120000
        assert d['shipping_cost_dollar'] == 15.0
        assert d['sales_date'] == '2024-02-01'
        assert d['paid_date'] is None
        assert d['shipped_date'] is None
        assert d['status'] == 'SOLD'
