from textwrap import dedent
from typing import ClassVar

from pydantic import BaseModel, ConfigDict

from celadon.models.validator import OptionalText


class Item(BaseModel):
    model_config = ConfigDict(extra='forbid')
    SELECT_ALL: ClassVar[str] = 'SELECT id, brand, name, quantity, cost FROM items'
    SELECT_ONE: ClassVar[str] = SELECT_ALL + ' WHERE id = %s'
    INSERT: ClassVar[str] = dedent('''\
        INSERT INTO items (brand, name, quantity, cost)
        VALUES (%(brand)s, %(name)s, %(quantity)s, %(cost)s) RETURNING id
    ''')
    UPDATE: ClassVar[str] = dedent('''\
        UPDATE items
        SET brand = %(brand)s, name = %(name)s, quantity = %(quantity)s, cost = %(cost)s
        WHERE id = %(id)s
    ''')

    id: int | None = None
    brand: OptionalText = ''
    name: OptionalText = ''
    quantity: int = 0
    cost: float = 0.0
