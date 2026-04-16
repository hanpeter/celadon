from werkzeug.exceptions import NotFound

from celadon.models import Customer, Item, Purchase, Purchaser, Sale, User


class Application:
    def __init__(self, database):
        self._database = database

    def get_purchaser(self, id) -> Purchaser:
        purchaser = self._database.get_purchaser(id)
        if purchaser is None:
            raise NotFound(f'Purchaser {id} not found')
        return purchaser

    def get_purchasers(self) -> list[Purchaser]:
        return self._database.get_purchasers()

    def add_purchaser(self, purchaser: Purchaser) -> Purchaser:
        id = self._database.add_purchaser(purchaser)
        return self.get_purchaser(id)

    def update_purchaser(self, purchaser: Purchaser) -> Purchaser:
        self._database.update_purchaser(purchaser)
        return self.get_purchaser(purchaser.id)

    def get_purchase(self, id) -> Purchase:
        purchase = self._database.get_purchase(id)
        if purchase is None:
            raise NotFound(f'Purchase {id} not found')
        return purchase

    def get_purchases(self) -> list[Purchase]:
        return self._database.get_purchases()

    def add_purchase(self, purchase: Purchase) -> Purchase:
        with self._database.transaction() as conn:
            for item in purchase.items:
                self._database.add_item(item, conn=conn)
            id = self._database.add_purchase(purchase, conn=conn)
        return self.get_purchase(id)

    def update_purchase(self, purchase: Purchase) -> Purchase:
        self._database.update_purchase(purchase)
        return self.get_purchase(purchase.id)

    def get_item(self, id) -> Item:
        item = self._database.get_item(id)
        if item is None:
            raise NotFound(f'Item {id} not found')
        return item

    def get_items(self) -> list[Item]:
        return self._database.get_items()

    def update_item(self, item: Item) -> Item:
        self._database.update_item(item)
        return self.get_item(item.id)

    def get_customer(self, id) -> Customer:
        customer = self._database.get_customer(id)
        if customer is None:
            raise NotFound(f'Customer {id} not found')
        return customer

    def get_customers(self) -> list[Customer]:
        return self._database.get_customers()

    def add_customer(self, customer: Customer) -> Customer:
        id = self._database.add_customer(customer)
        return self.get_customer(id)

    def update_customer(self, customer: Customer) -> Customer:
        self._database.update_customer(customer)
        return self.get_customer(customer.id)

    def get_sale(self, id) -> Sale:
        sale = self._database.get_sale(id)
        if sale is None:
            raise NotFound(f'Sale {id} not found')
        return sale

    def get_sales(self) -> list[Sale]:
        return self._database.get_sales()

    def add_sale(self, sale: Sale) -> Sale:
        id = self._database.add_sale(sale)
        return self.get_sale(id)

    def update_sale(self, sale: Sale) -> Sale:
        self._database.update_sale(sale)
        return self.get_sale(sale.id)

    def delete_sale(self, id) -> None:
        self.get_sale(id)  # raises NotFound if missing
        self._database.delete_sale(id)

    # Auth methods are kept here for now. Extract to a dedicated AuthApplication
    # class if auth logic grows (e.g. roles, permissions, audit logging).
    def get_user_by_email(self, email) -> User | None:
        return self._database.get_user_by_email(email)
