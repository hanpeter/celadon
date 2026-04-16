from datetime import date, datetime
from textwrap import dedent
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, field_serializer, field_validator

from celadon.models.item import Item
from celadon.models.validator import OptionalText


class Purchase(BaseModel):
    model_config = ConfigDict(extra='forbid')
    SELECT_ALL: ClassVar[str] = dedent('''\
        SELECT purchases.id, purchases.purchase_date, purchases.cost,
               purchasers.id AS purchaser_id, purchasers.name AS purchaser_name
        FROM purchases INNER JOIN purchasers ON purchases.purchaser_id = purchasers.id
    ''')
    SELECT_ONE: ClassVar[str] = SELECT_ALL + ' WHERE purchases.id = %s'
    INSERT: ClassVar[str] = dedent('''\
        INSERT INTO purchases (purchase_date, cost, purchaser_id)
        VALUES (%(purchase_date)s, %(cost)s, %(purchaser_id)s) RETURNING id
    ''')
    UPDATE: ClassVar[str] = dedent('''\
        UPDATE purchases
        SET purchase_date = %(purchase_date)s, cost = %(cost)s, purchaser_id = %(purchaser_id)s
        WHERE id = %(id)s
    ''')

    id: int | None = None
    purchase_date: date
    cost: float = 0.0
    purchaser_id: int
    purchaser_name: OptionalText = ''
    items: list[Item] = []

    SERVER_FIELDS: ClassVar[frozenset[str]] = frozenset({'purchaser_name'})

    @field_validator('purchase_date', mode='before')
    @classmethod
    def strip_time(cls, v: date | datetime | str | None) -> date | str | None:
        if isinstance(v, datetime):
            return v.date()
        return v

    @field_serializer('purchase_date', when_used='json')
    def serialize_date(self, v: date) -> str:
        return v.isoformat()
