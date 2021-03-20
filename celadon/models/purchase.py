# -*- coding: utf-8 -*-

from textwrap import dedent
from datetime import datetime


class Purchase(object):
    SELECT_ALL = dedent('''\
        SELECT purchases.id, purchases.purchase_date, purchases.cost, purchasers.id, purchasers.name
        FROM purchases INNER JOIN purchasers ON purchases.purchaser_id = purchasers.id
    ''')
    SELECT_ONE = SELECT_ALL + " WHERE purchases.id = %s"
    INSERT = dedent('''\
        INSERT INTO purchases (purchase_date, cost, purchaser_id)
        VALUES (%(purchase_date)s, %(cost)s, %(purchaser_id)s) RETURNING id
    ''')
    UPDATE = dedent('''\
        UPDATE purchases
        SET purchase_date = %(purchase_date)s, cost = %(cost)s, purchaser_id = %(purchaser_id)s
        WHERE id = %(id)s
    ''')

    def __init__(self, id, purchase_date, cost, purchaser_id, purchaser_name, items=[]):
        self.id = id
        self.purchase_date = purchase_date
        self.cost = float(cost)
        self.purchaser_id = purchaser_id
        self.purchaser_name = purchaser_name
        self.items = items

    def to_dict(self):
        return {
            'id': self.id,
            'purchase_date': self.purchase_date.strftime("%Y-%m-%d"),
            'cost': self.cost,
            'purchaser_id': self.purchaser_id,
            'purchaser_name': self.purchaser_name,
        }

    @classmethod
    def from_dict(cls, d):
        purchase_date = datetime.strptime(d.get('purchase_date', ''), "%Y-%m-%d")

        purchaser_id = d.get('purchaser_id')
        if purchaser_id is None:
            raise ValueError('Invalid purchaser ID')

        return cls(
            d.get('id'),
            purchase_date,
            d.get('cost', 0),
            purchaser_id,
            '',
            [Item.from_dict(i) for i in d.get('items', [])],
        )
