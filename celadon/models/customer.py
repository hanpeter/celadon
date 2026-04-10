from textwrap import dedent


class Customer:
    SELECT_ALL = dedent('''\
        SELECT id, name, nickname, phone_number, address, postal_code,
               personal_customs_clearance_code
        FROM customers
    ''')
    SELECT_ONE = SELECT_ALL.rstrip() + ' WHERE id = %s\n'
    INSERT = dedent('''\
        INSERT INTO customers
            (name, nickname, phone_number, address, postal_code,
             personal_customs_clearance_code)
        VALUES (%(name)s, %(nickname)s, %(phone_number)s, %(address)s,
                %(postal_code)s, %(personal_customs_clearance_code)s)
        RETURNING id
    ''')
    UPDATE = dedent('''\
        UPDATE customers SET
            name = %(name)s,
            nickname = %(nickname)s,
            phone_number = %(phone_number)s,
            address = %(address)s,
            postal_code = %(postal_code)s,
            personal_customs_clearance_code = %(personal_customs_clearance_code)s
        WHERE id = %(id)s
    ''')

    def __init__(self, id, name, nickname, phone_number, address, postal_code,
                 personal_customs_clearance_code):
        self.id = id
        self.name = name
        self.nickname = nickname
        self.phone_number = phone_number
        self.address = address
        self.postal_code = postal_code
        self.personal_customs_clearance_code = personal_customs_clearance_code

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'nickname': self.nickname,
            'phone_number': self.phone_number,
            'address': self.address,
            'postal_code': self.postal_code,
            'personal_customs_clearance_code': self.personal_customs_clearance_code,
        }

    @classmethod
    def from_dict(cls, d):
        return cls(
            d.get('id'),
            d.get('name', ''),
            d.get('nickname', ''),
            d.get('phone_number', ''),
            d.get('address', ''),
            d.get('postal_code', ''),
            d.get('personal_customs_clearance_code', ''),
        )
