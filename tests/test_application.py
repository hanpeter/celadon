import pytest
from unittest.mock import MagicMock, call
from werkzeug.exceptions import NotFound


class TestPurchaser:
    def test_get_purchaser_found(self, mock_db, app_instance):
        row = MagicMock()
        row.to_dict.return_value = {'id': 1, 'name': 'Acme'}
        mock_db.get_purchaser.return_value = [row]
        assert app_instance.get_purchaser(1) == {'id': 1, 'name': 'Acme'}
        mock_db.get_purchaser.assert_called_once_with(1)

    def test_get_purchaser_not_found(self, mock_db, app_instance):
        mock_db.get_purchaser.return_value = []
        with pytest.raises(NotFound, match='Purchaser 404 not found'):
            app_instance.get_purchaser(404)

    def test_get_purchasers(self, mock_db, app_instance):
        a = MagicMock()
        a.to_dict.return_value = {'id': 1, 'name': 'A'}
        b = MagicMock()
        b.to_dict.return_value = {'id': 2, 'name': 'B'}
        mock_db.get_purchasers.return_value = [a, b]
        assert app_instance.get_purchasers() == [{'id': 1, 'name': 'A'}, {'id': 2, 'name': 'B'}]

    def test_add_purchaser(self, mock_db, app_instance):
        purchaser = MagicMock()
        mock_db.add_purchaser.return_value = 99
        stored = MagicMock()
        stored.to_dict.return_value = {'id': 99, 'name': 'New'}
        mock_db.get_purchaser.return_value = [stored]
        assert app_instance.add_purchaser(purchaser) == {'id': 99, 'name': 'New'}
        mock_db.add_purchaser.assert_called_once_with(purchaser)
        mock_db.get_purchaser.assert_called_once_with(99)

    def test_update_purchaser(self, mock_db, app_instance):
        purchaser = MagicMock()
        purchaser.id = 5
        updated = MagicMock()
        updated.to_dict.return_value = {'id': 5, 'name': 'Updated'}
        mock_db.get_purchaser.return_value = [updated]
        assert app_instance.update_purchaser(purchaser) == {'id': 5, 'name': 'Updated'}
        mock_db.update_purchaser.assert_called_once_with(purchaser)
        mock_db.get_purchaser.assert_called_once_with(5)


class TestPurchase:
    def test_get_purchase_found(self, mock_db, app_instance):
        row = MagicMock()
        row.to_dict.return_value = {'id': 10, 'total': 100}
        mock_db.get_purchase.return_value = [row]
        assert app_instance.get_purchase(10) == {'id': 10, 'total': 100}
        mock_db.get_purchase.assert_called_once_with(10)

    def test_get_purchase_not_found(self, mock_db, app_instance):
        mock_db.get_purchase.return_value = []
        with pytest.raises(NotFound, match='Purchase 7 not found'):
            app_instance.get_purchase(7)

    def test_get_purchases(self, mock_db, app_instance):
        a = MagicMock()
        a.to_dict.return_value = {'id': 1}
        b = MagicMock()
        b.to_dict.return_value = {'id': 2}
        mock_db.get_purchases.return_value = [a, b]
        assert app_instance.get_purchases() == [{'id': 1}, {'id': 2}]

    def test_add_purchase_calls_add_item_before_add_purchase(self, mock_db, app_instance):
        purchase = MagicMock()
        item1 = MagicMock()
        item2 = MagicMock()
        purchase.items = [item1, item2]
        mock_db.add_purchase.return_value = 200
        stored = MagicMock()
        stored.to_dict.return_value = {'id': 200}
        mock_db.get_purchase.return_value = [stored]
        assert app_instance.add_purchase(purchase) == {'id': 200}
        mock_db.assert_has_calls(
            [call.add_item(item1), call.add_item(item2), call.add_purchase(purchase)],
            any_order=False,
        )
        mock_db.get_purchase.assert_called_once_with(200)

    def test_update_purchase(self, mock_db, app_instance):
        purchase = MagicMock()
        purchase.id = 3
        updated = MagicMock()
        updated.to_dict.return_value = {'id': 3, 'revised': True}
        mock_db.get_purchase.return_value = [updated]
        assert app_instance.update_purchase(purchase) == {'id': 3, 'revised': True}
        mock_db.update_purchase.assert_called_once_with(purchase)
        mock_db.get_purchase.assert_called_once_with(3)


class TestItem:
    def test_get_item_found(self, mock_db, app_instance):
        row = MagicMock()
        row.to_dict.return_value = {'id': 50, 'name': 'Widget'}
        mock_db.get_item.return_value = [row]
        assert app_instance.get_item(50) == {'id': 50, 'name': 'Widget'}
        mock_db.get_item.assert_called_once_with(50)

    def test_get_item_not_found(self, mock_db, app_instance):
        mock_db.get_item.return_value = []
        with pytest.raises(NotFound, match='Item 0 not found'):
            app_instance.get_item(0)

    def test_get_items(self, mock_db, app_instance):
        a = MagicMock()
        a.to_dict.return_value = {'id': 1}
        b = MagicMock()
        b.to_dict.return_value = {'id': 2}
        mock_db.get_items.return_value = [a, b]
        assert app_instance.get_items() == [{'id': 1}, {'id': 2}]

    def test_update_item(self, mock_db, app_instance):
        item = MagicMock()
        item.id = 8
        updated = MagicMock()
        updated.to_dict.return_value = {'id': 8, 'quantity': 5}
        mock_db.get_item.return_value = [updated]
        assert app_instance.update_item(item) == {'id': 8, 'quantity': 5}
        mock_db.update_item.assert_called_once_with(item)
        mock_db.get_item.assert_called_once_with(8)


class TestCustomer:
    def test_get_customer_found(self, mock_db, app_instance):
        row = MagicMock()
        row.to_dict.return_value = {'id': 1, 'name': 'Alice'}
        mock_db.get_customer.return_value = [row]
        assert app_instance.get_customer(1) == {'id': 1, 'name': 'Alice'}
        mock_db.get_customer.assert_called_once_with(1)

    def test_get_customer_not_found(self, mock_db, app_instance):
        mock_db.get_customer.return_value = []
        with pytest.raises(NotFound, match='Customer 2 not found'):
            app_instance.get_customer(2)

    def test_get_customers(self, mock_db, app_instance):
        a = MagicMock()
        a.to_dict.return_value = {'id': 1}
        b = MagicMock()
        b.to_dict.return_value = {'id': 2}
        mock_db.get_customers.return_value = [a, b]
        assert app_instance.get_customers() == [{'id': 1}, {'id': 2}]

    def test_add_customer(self, mock_db, app_instance):
        customer = MagicMock()
        mock_db.add_customer.return_value = 11
        stored = MagicMock()
        stored.to_dict.return_value = {'id': 11, 'name': 'Bob'}
        mock_db.get_customer.return_value = [stored]
        assert app_instance.add_customer(customer) == {'id': 11, 'name': 'Bob'}
        mock_db.add_customer.assert_called_once_with(customer)
        mock_db.get_customer.assert_called_once_with(11)

    def test_update_customer(self, mock_db, app_instance):
        customer = MagicMock()
        customer.id = 4
        updated = MagicMock()
        updated.to_dict.return_value = {'id': 4, 'name': 'Carol'}
        mock_db.get_customer.return_value = [updated]
        assert app_instance.update_customer(customer) == {'id': 4, 'name': 'Carol'}
        mock_db.update_customer.assert_called_once_with(customer)
        mock_db.get_customer.assert_called_once_with(4)


class TestSale:
    def test_get_sale_found(self, mock_db, app_instance):
        row = MagicMock()
        row.to_dict.return_value = {'id': 20, 'status': 'open'}
        mock_db.get_sale.return_value = [row]
        assert app_instance.get_sale(20) == {'id': 20, 'status': 'open'}
        mock_db.get_sale.assert_called_once_with(20)

    def test_get_sale_not_found(self, mock_db, app_instance):
        mock_db.get_sale.return_value = []
        with pytest.raises(NotFound, match='Sale 9 not found'):
            app_instance.get_sale(9)

    def test_get_sales(self, mock_db, app_instance):
        a = MagicMock()
        a.to_dict.return_value = {'id': 1}
        b = MagicMock()
        b.to_dict.return_value = {'id': 2}
        mock_db.get_sales.return_value = [a, b]
        assert app_instance.get_sales() == [{'id': 1}, {'id': 2}]

    def test_add_sale(self, mock_db, app_instance):
        sale = MagicMock()
        mock_db.add_sale.return_value = 30
        stored = MagicMock()
        stored.to_dict.return_value = {'id': 30, 'status': 'closed'}
        mock_db.get_sale.return_value = [stored]
        assert app_instance.add_sale(sale) == {'id': 30, 'status': 'closed'}
        mock_db.add_sale.assert_called_once_with(sale)
        mock_db.get_sale.assert_called_once_with(30)

    def test_update_sale(self, mock_db, app_instance):
        sale = MagicMock()
        sale.id = 6
        updated = MagicMock()
        updated.to_dict.return_value = {'id': 6, 'status': 'pending'}
        mock_db.get_sale.return_value = [updated]
        assert app_instance.update_sale(sale) == {'id': 6, 'status': 'pending'}
        mock_db.update_sale.assert_called_once_with(sale)
        mock_db.get_sale.assert_called_once_with(6)

    def test_delete_sale_found(self, mock_db, app_instance):
        row = MagicMock()
        row.to_dict.return_value = {'id': 7, 'status': 'SOLD'}
        mock_db.get_sale.return_value = [row]
        app_instance.delete_sale(7)
        mock_db.get_sale.assert_called_once_with(7)
        mock_db.delete_sale.assert_called_once_with(7)

    def test_delete_sale_not_found(self, mock_db, app_instance):
        mock_db.get_sale.return_value = []
        with pytest.raises(NotFound, match='Sale 99 not found'):
            app_instance.delete_sale(99)
        mock_db.delete_sale.assert_not_called()
