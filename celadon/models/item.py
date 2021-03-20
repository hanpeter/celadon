# -*- coding: utf-8 -*-

from textwrap import dedent


class Item(object):
    SELECT_ALL = 'SELECT * FROM items'
    SELECT_ONE = SELECT_ALL + " WHERE id = %s"
    INSERT = dedent('''\
        INSERT INTO items (brand, name, quantity, cost)
        VALUES (%(brand)s, %(name)s, %(quantity)s, %(cost)s) RETURNING id
    ''')
    UPDATE = dedent('''\
        UPDATE items
        SET brand = %(brand)s, name = %(name)s, quantity = %(quantity)s, cost = %(cost)s
        WHERE id = %(id)s
    ''')

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
