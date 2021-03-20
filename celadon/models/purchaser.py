# -*- coding: utf-8 -*-


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
