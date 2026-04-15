from werkzeug.exceptions import NotFound


class Application:
    def __init__(self, database):
        self._database = database

    def get_purchaser(self, id):
        purchaser = self._database.get_purchaser(id)
        if purchaser is None:
            raise NotFound(f'Purchaser {id} not found')
        return purchaser.to_dict()

    def get_purchasers(self):
        return [purchaser.to_dict() for purchaser in self._database.get_purchasers()]

    def add_purchaser(self, purchaser):
        id = self._database.add_purchaser(purchaser)
        return self.get_purchaser(id)

    def update_purchaser(self, purchaser):
        self._database.update_purchaser(purchaser)
        return self.get_purchaser(purchaser.id)

    def get_purchase(self, id):
        purchase = self._database.get_purchase(id)
        if purchase is None:
            raise NotFound(f'Purchase {id} not found')
        return purchase.to_dict()

    def get_purchases(self):
        return [purchase.to_dict() for purchase in self._database.get_purchases()]

    def add_purchase(self, purchase):
        with self._database.transaction() as conn:
            for item in purchase.items:
                self._database.add_item(item, conn=conn)
            id = self._database.add_purchase(purchase, conn=conn)
        return self.get_purchase(id)

    def update_purchase(self, purchase):
        self._database.update_purchase(purchase)
        return self.get_purchase(purchase.id)

    def get_item(self, id):
        item = self._database.get_item(id)
        if item is None:
            raise NotFound(f'Item {id} not found')
        return item.to_dict()

    def get_items(self):
        return [item.to_dict() for item in self._database.get_items()]

    def update_item(self, item):
        self._database.update_item(item)
        return self.get_item(item.id)

    def get_customer(self, id):
        customer = self._database.get_customer(id)
        if customer is None:
            raise NotFound(f'Customer {id} not found')
        return customer.to_dict()

    def get_customers(self):
        return [customer.to_dict() for customer in self._database.get_customers()]

    def add_customer(self, customer):
        id = self._database.add_customer(customer)
        return self.get_customer(id)

    def update_customer(self, customer):
        self._database.update_customer(customer)
        return self.get_customer(customer.id)

    def get_sale(self, id):
        sale = self._database.get_sale(id)
        if sale is None:
            raise NotFound(f'Sale {id} not found')
        return sale.to_dict()

    def get_sales(self):
        return [sale.to_dict() for sale in self._database.get_sales()]

    def add_sale(self, sale):
        id = self._database.add_sale(sale)
        return self.get_sale(id)

    def update_sale(self, sale):
        self._database.update_sale(sale)
        return self.get_sale(sale.id)

    def delete_sale(self, id):
        self.get_sale(id)  # raises NotFound if missing
        self._database.delete_sale(id)

    # Auth methods are kept here for now. Extract to a dedicated AuthApplication
    # class if auth logic grows (e.g. roles, permissions, audit logging).
    def get_user_by_email(self, email):
        user = self._database.get_user_by_email(email)
        return user.to_dict() if user else None
