from textwrap import dedent
from typing import ClassVar
from pydantic import BaseModel


class Customer(BaseModel):
    SELECT_ALL: ClassVar[str] = dedent('''\
        SELECT id, name, nickname, phone_number, address, postal_code,
               personal_customs_clearance_code
        FROM customers
    ''')
    SELECT_ONE: ClassVar[str] = SELECT_ALL.rstrip() + ' WHERE id = %s\n'
    INSERT: ClassVar[str] = dedent('''\
        INSERT INTO customers
            (name, nickname, phone_number, address, postal_code,
             personal_customs_clearance_code)
        VALUES (%(name)s, %(nickname)s, %(phone_number)s, %(address)s,
                %(postal_code)s, %(personal_customs_clearance_code)s)
        RETURNING id
    ''')
    UPDATE: ClassVar[str] = dedent('''\
        UPDATE customers SET
            name = %(name)s,
            nickname = %(nickname)s,
            phone_number = %(phone_number)s,
            address = %(address)s,
            postal_code = %(postal_code)s,
            personal_customs_clearance_code = %(personal_customs_clearance_code)s
        WHERE id = %(id)s
    ''')

    id: int | None = None
    name: str = ''
    nickname: str = ''
    phone_number: str = ''
    address: str = ''
    postal_code: str = ''
    personal_customs_clearance_code: str = ''
