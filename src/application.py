# -*- coding: utf-8 -*-


class Application(object):
    def __init__(self, database):
        self._database = database

    def get_purchaser(self, id):
        purchasers = self._database.get_purchaser(id)

        if len(purchasers) > 0:
            return purchasers[0].to_dict()
        else:
            return {}

    def get_purchasers(self):
        return [purchaser.to_dict() for purchaser in self._database.get_purchasers()]

    def add_purchaser(self, purchaser):
        id = self._database.add_purchaser(purchaser)
        return self.get_purchaser(id)

    def update_purchaser(self, purchaser):
        self._database.update_purchaser(purchaser)
        return self.get_purchaser(purchaser.id)

    def get_purchase(self, id):
        purchases = self._database.get_purchase(id)

        if len(purchases) > 0:
            return purchases[0].to_dict()
        else:
            return {}

    def get_purchases(self):
        return [purchase.to_dict() for purchase in self._database.get_purchases()]

    def add_purchase(self, purchase):
        for item in purchase.items:
            self._database.add_item(item)

        id = self._database.add_purchase(purchase)
        return self.get_purchase(id)

    def update_purchase(self, purchase):
        self._database.update_purchase(purchase)
        return self.get_purchase(purchase.id)

    def get_item(self, id):
        items = self._database.get_item(id)

        if len(items) > 0:
            return items[0].to_dict()
        else:
            return {}

    def get_items(self):
        return [item.to_dict() for item in self._database.get_items()]

    def update_item(self, item):
        self._database.update_item(item)
        return self.get_item(item.id)
