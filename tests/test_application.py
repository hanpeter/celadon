import pytest
from unittest.mock import MagicMock, call
from werkzeug.exceptions import NotFound
from celadon.models import Customer, Item, Purchase, Purchaser, Sale


class TestPurchaser:
    def test_get_purchaser_found(self, mock_db, app_instance):
        model = Purchaser(id=1, name='Acme', is_active=True)
        mock_db.get_purchaser.return_value = model
        result = app_instance.get_purchaser(1)
        assert isinstance(result, Purchaser)
        assert result.id == 1
        mock_db.get_purchaser.assert_called_once_with(1)

    def test_get_purchaser_not_found(self, mock_db, app_instance):
        mock_db.get_purchaser.return_value = None
        with pytest.raises(NotFound, match='Purchaser 404 not found'):
            app_instance.get_purchaser(404)

    def test_get_purchasers(self, mock_db, app_instance):
        models = [Purchaser(id=1, name='A'), Purchaser(id=2, name='B')]
        mock_db.get_purchasers.return_value = models
        result = app_instance.get_purchasers()
        assert result == models

    def test_add_purchaser(self, mock_db, app_instance):
        purchaser = MagicMock()
        mock_db.add_purchaser.return_value = 99
        stored = Purchaser(id=99, name='New')
        mock_db.get_purchaser.return_value = stored
        result = app_instance.add_purchaser(purchaser)
        assert isinstance(result, Purchaser)
        assert result.id == 99
        mock_db.add_purchaser.assert_called_once_with(purchaser)
        mock_db.get_purchaser.assert_called_once_with(99)

    def test_update_purchaser(self, mock_db, app_instance):
        purchaser = MagicMock()
        purchaser.id = 5
        updated = Purchaser(id=5, name='Updated')
        mock_db.get_purchaser.return_value = updated
        result = app_instance.update_purchaser(purchaser)
        assert isinstance(result, Purchaser)
        assert result.id == 5
        mock_db.update_purchaser.assert_called_once_with(purchaser)
        mock_db.get_purchaser.assert_called_once_with(5)


class TestPurchase:
    def test_get_purchase_found(self, mock_db, app_instance):
        from datetime import date
        model = Purchase(id=10, purchase_date=date(2024, 1, 1), cost=100.0, purchaser_id=1)
        mock_db.get_purchase.return_value = model
        result = app_instance.get_purchase(10)
        assert isinstance(result, Purchase)
        assert result.id == 10
        mock_db.get_purchase.assert_called_once_with(10)

    def test_get_purchase_not_found(self, mock_db, app_instance):
        mock_db.get_purchase.return_value = None
        with pytest.raises(NotFound, match='Purchase 7 not found'):
            app_instance.get_purchase(7)

    def test_get_purchases(self, mock_db, app_instance):
        from datetime import date
        models = [
            Purchase(id=1, purchase_date=date(2024, 1, 1), cost=10.0, purchaser_id=1),
            Purchase(id=2, purchase_date=date(2024, 2, 1), cost=20.0, purchaser_id=1),
        ]
        mock_db.get_purchases.return_value = models
        result = app_instance.get_purchases()
        assert result == models

    def test_add_purchase_calls_add_item_before_add_purchase(self, mock_db, app_instance):
        from datetime import date
        purchase = MagicMock()
        item1 = MagicMock()
        item2 = MagicMock()
        purchase.items = [item1, item2]
        mock_db.add_purchase.return_value = 200
        stored = Purchase(id=200, purchase_date=date(2024, 1, 1), cost=50.0, purchaser_id=1)
        mock_db.get_purchase.return_value = stored
        result = app_instance.add_purchase(purchase)
        assert isinstance(result, Purchase)
        assert result.id == 200
        mock_db.assert_has_calls(
            [call.add_item(item1, conn=mock_db.transaction.return_value.__enter__.return_value),
             call.add_item(item2, conn=mock_db.transaction.return_value.__enter__.return_value),
             call.add_purchase(purchase, conn=mock_db.transaction.return_value.__enter__.return_value)],
            any_order=False,
        )
        mock_db.get_purchase.assert_called_once_with(200)

    def test_update_purchase(self, mock_db, app_instance):
        from datetime import date
        purchase = MagicMock()
        purchase.id = 3
        updated = Purchase(id=3, purchase_date=date(2024, 1, 1), cost=99.0, purchaser_id=1)
        mock_db.get_purchase.return_value = updated
        result = app_instance.update_purchase(purchase)
        assert isinstance(result, Purchase)
        assert result.id == 3
        mock_db.update_purchase.assert_called_once_with(purchase)
        mock_db.get_purchase.assert_called_once_with(3)


class TestItem:
    def test_get_item_found(self, mock_db, app_instance):
        model = Item(id=50, brand='X', name='Widget', quantity=1, cost=9.99)
        mock_db.get_item.return_value = model
        result = app_instance.get_item(50)
        assert isinstance(result, Item)
        assert result.id == 50
        mock_db.get_item.assert_called_once_with(50)

    def test_get_item_not_found(self, mock_db, app_instance):
        mock_db.get_item.return_value = None
        with pytest.raises(NotFound, match='Item 0 not found'):
            app_instance.get_item(0)

    def test_get_items(self, mock_db, app_instance):
        models = [Item(id=1, brand='A', name='X', quantity=1, cost=1.0),
                  Item(id=2, brand='B', name='Y', quantity=2, cost=2.0)]
        mock_db.get_items.return_value = models
        result = app_instance.get_items()
        assert result == models

    def test_update_item(self, mock_db, app_instance):
        item = MagicMock()
        item.id = 8
        updated = Item(id=8, brand='B', name='Hat', quantity=5, cost=30.0)
        mock_db.get_item.return_value = updated
        result = app_instance.update_item(item)
        assert isinstance(result, Item)
        assert result.id == 8
        mock_db.update_item.assert_called_once_with(item)
        mock_db.get_item.assert_called_once_with(8)


class TestCustomer:
    def test_get_customer_found(self, mock_db, app_instance):
        model = Customer(id=1, name='Alice')
        mock_db.get_customer.return_value = model
        result = app_instance.get_customer(1)
        assert isinstance(result, Customer)
        assert result.id == 1
        mock_db.get_customer.assert_called_once_with(1)

    def test_get_customer_not_found(self, mock_db, app_instance):
        mock_db.get_customer.return_value = None
        with pytest.raises(NotFound, match='Customer 2 not found'):
            app_instance.get_customer(2)

    def test_get_customers(self, mock_db, app_instance):
        models = [Customer(id=1, name='Alice'), Customer(id=2, name='Bob')]
        mock_db.get_customers.return_value = models
        result = app_instance.get_customers()
        assert result == models

    def test_add_customer(self, mock_db, app_instance):
        customer = MagicMock()
        mock_db.add_customer.return_value = 11
        stored = Customer(id=11, name='Bob')
        mock_db.get_customer.return_value = stored
        result = app_instance.add_customer(customer)
        assert isinstance(result, Customer)
        assert result.id == 11
        mock_db.add_customer.assert_called_once_with(customer)
        mock_db.get_customer.assert_called_once_with(11)

    def test_update_customer(self, mock_db, app_instance):
        customer = MagicMock()
        customer.id = 4
        updated = Customer(id=4, name='Carol')
        mock_db.get_customer.return_value = updated
        result = app_instance.update_customer(customer)
        assert isinstance(result, Customer)
        assert result.id == 4
        mock_db.update_customer.assert_called_once_with(customer)
        mock_db.get_customer.assert_called_once_with(4)


class TestSale:
    def test_get_sale_found(self, mock_db, app_instance):
        model = Sale(id=20, customer_id=1)
        mock_db.get_sale.return_value = model
        result = app_instance.get_sale(20)
        assert isinstance(result, Sale)
        assert result.id == 20
        mock_db.get_sale.assert_called_once_with(20)

    def test_get_sale_not_found(self, mock_db, app_instance):
        mock_db.get_sale.return_value = None
        with pytest.raises(NotFound, match='Sale 9 not found'):
            app_instance.get_sale(9)

    def test_get_sales(self, mock_db, app_instance):
        models = [Sale(id=1, customer_id=1), Sale(id=2, customer_id=2)]
        mock_db.get_sales.return_value = models
        result = app_instance.get_sales()
        assert result == models

    def test_add_sale(self, mock_db, app_instance):
        sale = MagicMock()
        mock_db.add_sale.return_value = 30
        stored = Sale(id=30, customer_id=1)
        mock_db.get_sale.return_value = stored
        result = app_instance.add_sale(sale)
        assert isinstance(result, Sale)
        assert result.id == 30
        mock_db.add_sale.assert_called_once_with(sale)
        mock_db.get_sale.assert_called_once_with(30)

    def test_update_sale(self, mock_db, app_instance):
        sale = MagicMock()
        sale.id = 6
        updated = Sale(id=6, customer_id=1)
        mock_db.get_sale.return_value = updated
        result = app_instance.update_sale(sale)
        assert isinstance(result, Sale)
        assert result.id == 6
        mock_db.update_sale.assert_called_once_with(sale)
        mock_db.get_sale.assert_called_once_with(6)

    def test_delete_sale_found(self, mock_db, app_instance):
        model = Sale(id=7, customer_id=1)
        mock_db.get_sale.return_value = model
        app_instance.delete_sale(7)
        mock_db.get_sale.assert_called_once_with(7)
        mock_db.delete_sale.assert_called_once_with(7)

    def test_delete_sale_not_found(self, mock_db, app_instance):
        mock_db.get_sale.return_value = None
        with pytest.raises(NotFound, match='Sale 99 not found'):
            app_instance.delete_sale(99)
        mock_db.delete_sale.assert_not_called()
