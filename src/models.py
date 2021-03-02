from textwrap import dedent
from datetime import datetime


class Purchaser(object):
    SELECT_ALL = 'SELECT * FROM purchasers'
    SELECT_ONE = SELECT_ALL + " WHERE purchasers.id = %s"
    INSERT = "INSERT INTO purchasers (name) VALUES (%(name)s) RETURNING id"
    UPDATE = "UPDATE purchasers SET name = %(name)s, is_active = %(is_active)s WHERE id = %(id)s"

    def __init__(self, id, name, is_active):
        self.id = id
        self.name = name
        self.is_active = is_active

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'is_active': self.is_active,
        }

    @classmethod
    def from_dict(cls, d):
        return cls(d.get('id'), d.get('name', ''), d.get('is_active', True))



class Purchase(object):
    SELECT_ALL = dedent('''\
        SELECT purchases.id, purchases.purchase_date, purchases.cost, purchasers.id, purchasers.name
        FROM purchases INNER JOIN purchasers ON purchases.purchaser_id = purchasers.id
    ''')
    SELECT_ONE = SELECT_ALL + " WHERE purchases.id = %s"
    INSERT = "INSERT INTO purchases (purchase_date, cost, purchaser_id) VALUES (%(purchase_date)s, %(cost)s, %(purchaser_id)s) RETURNING id"
    UPDATE = "UPDATE purchases SET purchase_date = %(purchase_date)s, cost = %(cost)s, purchaser_id = %(purchaser_id)s WHERE id = %(id)s"

    def __init__(self, id, purchase_date, cost, purchaser_id, purchaser_name, items = []):
        self.id = id
        self.purchase_date = purchase_date
        self.cost = float(cost)
        self.purchaser_id = purchaser_id
        self.purchaser_name = purchaser_name
        self.items = items

    def to_dict(self):
        return {
            'id': self.id,
            'purchase_date': self.purchase_date,
            'cost': self.cost,
            'purchaser_id': self.purchaser_id,
            'purchaser_name': self.purchaser_name,
        }

    @classmethod
    def from_dict(cls, d):
        purchase_date = datetime.strptime(d.get('purchase_date', ''), "%Y-%m-%dT%H:%M:%S%z")

        purchaser_id = d.get('purchaser_id')
        if purchaser_id is None:
            raise ValueError('Invalid purchaser ID')

        return cls(d.get('id'), purchase_date, d.get('cost', 0), purchaser_id, '', [Item.from_dict(i) for i in d.get('items', [])])


class Item(object):
    SELECT_ALL = 'SELECT * FROM items'
    SELECT_ONE = SELECT_ALL + " WHERE id = %s"
    INSERT = "INSERT INTO items (brand, name, quantity, cost) VALUES (%(brand)s, %(name)s, %(quantity)s, %(cost)s) RETURNING id"
    UPDATE = "UPDATE items SET brand = %(brand)s, name = %(name)s, quantity = %(quantity)s, cost = %(cost)s WHERE id = %(id)s"

    def __init__(self, id, brand, name, quantity, cost):
        self.id = id
        self.brand = brand
        self.name = name
        self.quantity = quantity
        self.cost = float(cost)

    def to_dict(self):
        return {
            'id': self.id,
            'brand': self.brand,
            'name': self.name,
            'quantity': self.quantity,
            'cost': self.cost,
        }

    @classmethod
    def from_dict(cls, d):
        return cls(d.get('id'), d.get('brand', ''), d.get('name', ''), d.get('quantity', 0), d.get('cost', 0))
