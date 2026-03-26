# -*- coding: utf-8 -*-

from datetime import datetime, timezone
from enum import Enum
from textwrap import dedent


def _parse_timestamp(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value)


class SaleStatus(Enum):
    SOLD = 'SOLD'
    PAID = 'PAID'
    SHIPPED = 'SHIPPED'


class Sale(object):
    SELECT_ALL = dedent('''\
        SELECT sales.id, sales.customer_id, sales.description, sales.sale_price_won,
               sales.shipping_cost_dollar, sales.sales_date, sales.paid_date, sales.shipped_date,
               customers.name, customers.nickname
        FROM sales INNER JOIN customers ON sales.customer_id = customers.id
    ''')
    SELECT_ONE = SELECT_ALL + ' WHERE sales.id = %s'
    INSERT = dedent('''\
        INSERT INTO sales
            (customer_id, description, sale_price_won, shipping_cost_dollar,
             sales_date, paid_date, shipped_date)
        VALUES (%(customer_id)s, %(description)s, %(sale_price_won)s, %(shipping_cost_dollar)s,
                %(sales_date)s, %(paid_date)s, %(shipped_date)s)
        RETURNING id
    ''')
    UPDATE = dedent('''\
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

    def __init__(self, id, customer_id, description, sale_price_won,
                 shipping_cost_dollar, sales_date, paid_date, shipped_date,
                 customer_name, customer_nickname):
        self.id = id
        self.customer_id = customer_id
        self.description = description
        self.sale_price_won = int(sale_price_won) if sale_price_won is not None else None
        self.shipping_cost_dollar = float(shipping_cost_dollar) if shipping_cost_dollar is not None else None
        self.sales_date = sales_date
        self.paid_date = paid_date
        self.shipped_date = shipped_date
        self.customer_name = customer_name
        self.customer_nickname = customer_nickname
        self.status = self._derive_status()

    def _derive_status(self):
        if self.shipped_date is not None:
            return SaleStatus.SHIPPED
        if self.paid_date is not None:
            return SaleStatus.PAID
        return SaleStatus.SOLD

    def _format_timestamp(self, ts):
        if ts is None:
            return None
        return ts.strftime('%Y-%m-%dT%H:%M:%S%z')

    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'customer_name': self.customer_name,
            'customer_nickname': self.customer_nickname,
            'description': self.description,
            'sale_price_won': self.sale_price_won,
            'shipping_cost_dollar': self.shipping_cost_dollar,
            'sales_date': self._format_timestamp(self.sales_date),
            'paid_date': self._format_timestamp(self.paid_date),
            'shipped_date': self._format_timestamp(self.shipped_date),
            'status': self.status.value,
        }

    @classmethod
    def from_dict(cls, d):
        customer_id = d.get('customer_id')
        if customer_id is None:
            raise ValueError('Invalid customer ID')

        return cls(
            d.get('id'),
            customer_id,
            d.get('description', ''),
            d.get('sale_price_won'),
            d.get('shipping_cost_dollar'),
            _parse_timestamp(d.get('sales_date')),
            _parse_timestamp(d.get('paid_date')),
            _parse_timestamp(d.get('shipped_date')),
            d.get('customer_name', ''),
            d.get('customer_nickname', ''),
        )
