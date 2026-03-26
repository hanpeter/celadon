# -*- coding: utf-8 -*-

from textwrap import dedent


class Customer(object):
    SELECT_ALL = 'SELECT * FROM customers'
    SELECT_ONE = SELECT_ALL + ' WHERE customers.id = %s'
    INSERT = dedent('''\
        INSERT INTO customers
            (name, nickname, cellular_phone_number, home_phone_number,
             address, personal_customs_clearance_code)
        VALUES (%(name)s, %(nickname)s, %(cellular_phone_number)s,
                %(home_phone_number)s, %(address)s,
                %(personal_customs_clearance_code)s)
        RETURNING id
    ''')
    UPDATE = dedent('''\
        UPDATE customers SET
            name = %(name)s,
            nickname = %(nickname)s,
            cellular_phone_number = %(cellular_phone_number)s,
            home_phone_number = %(home_phone_number)s,
            address = %(address)s,
            personal_customs_clearance_code = %(personal_customs_clearance_code)s
        WHERE id = %(id)s
    ''')

    def __init__(self, id, name, nickname, cellular_phone_number,
                 home_phone_number, address, personal_customs_clearance_code):
        self.id = id
        self.name = name
        self.nickname = nickname
        self.cellular_phone_number = cellular_phone_number
        self.home_phone_number = home_phone_number
        self.address = address
        self.personal_customs_clearance_code = personal_customs_clearance_code

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'nickname': self.nickname,
            'cellular_phone_number': self.cellular_phone_number,
            'home_phone_number': self.home_phone_number,
            'address': self.address,
            'personal_customs_clearance_code': self.personal_customs_clearance_code,
        }

    @classmethod
    def from_dict(cls, d):
        return cls(
            d.get('id'),
            d.get('name', ''),
            d.get('nickname', ''),
            d.get('cellular_phone_number', ''),
            d.get('home_phone_number', ''),
            d.get('address', ''),
            d.get('personal_customs_clearance_code', ''),
        )
