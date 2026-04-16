from datetime import date, datetime
from enum import Enum
from textwrap import dedent
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, computed_field, field_serializer, field_validator


class SaleStatus(Enum):
    SOLD = 'SOLD'
    PAID = 'PAID'
    SHIPPED = 'SHIPPED'


class Sale(BaseModel):
    model_config = ConfigDict(extra='forbid')
    SELECT_ALL: ClassVar[str] = dedent('''\
        SELECT sales.id, sales.customer_id, sales.description, sales.sale_price_won,
               sales.shipping_cost_dollar, sales.sales_date, sales.paid_date, sales.shipped_date,
               customers.name AS customer_name, customers.nickname AS customer_nickname
        FROM sales INNER JOIN customers ON sales.customer_id = customers.id
    ''')
    SELECT_ONE: ClassVar[str] = SELECT_ALL + ' WHERE sales.id = %s'
    INSERT: ClassVar[str] = dedent('''\
        INSERT INTO sales
            (customer_id, description, sale_price_won, shipping_cost_dollar,
             sales_date, paid_date, shipped_date)
        VALUES (%(customer_id)s, %(description)s, %(sale_price_won)s, %(shipping_cost_dollar)s,
                %(sales_date)s, %(paid_date)s, %(shipped_date)s)
        RETURNING id
    ''')
    UPDATE: ClassVar[str] = dedent('''\
        UPDATE sales SET
            customer_id = %(customer_id)s,
            description = %(description)s,
            sale_price_won = %(sale_price_won)s,
            shipping_cost_dollar = %(shipping_cost_dollar)s,
            sales_date = %(sales_date)s,
            paid_date = %(paid_date)s,
            shipped_date = %(shipped_date)s
        WHERE id = %(id)s
    ''')
    DELETE: ClassVar[str] = 'DELETE FROM sales WHERE id = %s'

    id: int | None = None
    customer_id: int
    description: str = ''
    sale_price_won: int | None = None
    shipping_cost_dollar: float | None = None
    sales_date: date | None = None
    paid_date: date | None = None
    shipped_date: date | None = None
    customer_name: str = ''
    customer_nickname: str = ''

    SERVER_FIELDS: ClassVar[frozenset[str]] = frozenset({
        'customer_name', 'customer_nickname', 'status',
    })

    @field_validator('sales_date', 'paid_date', 'shipped_date', mode='before')
    @classmethod
    def strip_time(cls, v: date | datetime | str | None) -> date | str | None:
        if isinstance(v, datetime):
            return v.date()
        return v

    @computed_field
    @property
    def status(self) -> SaleStatus:
        if self.shipped_date:
            return SaleStatus.SHIPPED
        if self.paid_date:
            return SaleStatus.PAID
        return SaleStatus.SOLD

    @field_serializer('sales_date', 'paid_date', 'shipped_date', when_used='json')
    def serialize_date(self, v: date | None) -> str | None:
        return v.isoformat() if v else None
