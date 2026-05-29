from textwrap import dedent
from typing import ClassVar

from pydantic import BaseModel, ConfigDict

from celadon.models.validator import OptionalText


class Customer(BaseModel):
    model_config = ConfigDict(extra='forbid')

    _SELECT_COLUMNS: ClassVar[str] = (
        'id, name, nickname, phone_number, address, postal_code, '
        'personal_customs_clearance_code'
    )
    TEXT_COLUMNS: ClassVar[tuple[str, ...]] = (
        'name', 'nickname', 'phone_number', 'address', 'postal_code',
        'personal_customs_clearance_code',
    )
    _SEARCH_WHERE: ClassVar[str] = (
        "WHERE (%(q)s = '' OR "
        + ' OR '.join(f'{col} ILIKE %(pattern)s' for col in TEXT_COLUMNS)
        + ')'
    )
    _PAGE_TAIL: ClassVar[str] = 'ORDER BY {sort_col} {sort_dir} LIMIT %(limit)s OFFSET %(offset)s'

    SELECT_ONE: ClassVar[str] = (
        f'SELECT {_SELECT_COLUMNS} FROM customers WHERE id = %s\n'
    )
    SEARCH_PAGE: ClassVar[str] = (
        f'SELECT {_SELECT_COLUMNS} FROM customers {_SEARCH_WHERE} {_PAGE_TAIL}'
    )
    SEARCH_COUNT: ClassVar[str] = f'SELECT COUNT(*) FROM customers {_SEARCH_WHERE}'
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
    name: OptionalText = ''
    nickname: OptionalText = ''
    phone_number: OptionalText = ''
    address: OptionalText = ''
    postal_code: OptionalText = ''
    personal_customs_clearance_code: OptionalText = ''
