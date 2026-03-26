# -*- coding: utf-8 -*-

import os
import psycopg2
from celadon.models import Customer, Item, Purchase, Purchaser, Sale


class Database(object):
    def __init__(self):
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            raise EnvironmentError('DATABASE_URL environment variable is not set')
        self._conn = psycopg2.connect(dsn=database_url)
        self._conn.set_session(autocommit=True)

    def get_purchasers(self):
        with self._conn.cursor() as cur:
            cur.execute(Purchaser.SELECT_ALL)
            return [Purchaser(*row) for row in cur]

    def get_purchaser(self, id):
        with self._conn.cursor() as cur:
            cur.execute(Purchaser.SELECT_ONE, [id])
            return [Purchaser(*row) for row in cur]

    def add_purchaser(self, purchaser):
        with self._conn.cursor() as cur:
            cur.execute(Purchaser.INSERT, purchaser.to_dict())
            return cur.fetchone()[0]

    def update_purchaser(self, purchaser):
        with self._conn.cursor() as cur:
            cur.execute(Purchaser.UPDATE, purchaser.to_dict())

    def get_purchases(self):
        with self._conn.cursor() as cur:
            cur.execute(Purchase.SELECT_ALL)
            return [Purchase(*row) for row in cur]

    def get_purchase(self, id):
        with self._conn.cursor() as cur:
            cur.execute(Purchase.SELECT_ONE, [id])
            return [Purchase(*row) for row in cur]

    def add_purchase(self, purchase):
        with self._conn.cursor() as cur:
            cur.execute(Purchase.INSERT, purchase.to_dict())
            return cur.fetchone()[0]

    def update_purchase(self, purchase):
        with self._conn.cursor() as cur:
            cur.execute(Purchase.UPDATE, purchase.to_dict())

    def get_items(self):
        with self._conn.cursor() as cur:
            cur.execute(Item.SELECT_ALL)
            return [Item(*row) for row in cur]

    def get_item(self, id):
        with self._conn.cursor() as cur:
            cur.execute(Item.SELECT_ONE, [id])
            return [Item(*row) for row in cur]

    def add_item(self, item):
        with self._conn.cursor() as cur:
            cur.execute(Item.INSERT, item.to_dict())
            return cur.fetchone()[0]

    def update_item(self, item):
        with self._conn.cursor() as cur:
            cur.execute(Item.UPDATE, item.to_dict())

    def get_customers(self):
        with self._conn.cursor() as cur:
            cur.execute(Customer.SELECT_ALL)
            return [Customer(*row) for row in cur]

    def get_customer(self, id):
        with self._conn.cursor() as cur:
            cur.execute(Customer.SELECT_ONE, [id])
            return [Customer(*row) for row in cur]

    def add_customer(self, customer):
        with self._conn.cursor() as cur:
            cur.execute(Customer.INSERT, customer.to_dict())
            return cur.fetchone()[0]

    def update_customer(self, customer):
        with self._conn.cursor() as cur:
            cur.execute(Customer.UPDATE, customer.to_dict())

    def get_sales(self):
        with self._conn.cursor() as cur:
            cur.execute(Sale.SELECT_ALL)
            return [Sale(*row) for row in cur]

    def get_sale(self, id):
        with self._conn.cursor() as cur:
            cur.execute(Sale.SELECT_ONE, [id])
            return [Sale(*row) for row in cur]

    def add_sale(self, sale):
        with self._conn.cursor() as cur:
            cur.execute(Sale.INSERT, sale.to_dict())
            return cur.fetchone()[0]

    def update_sale(self, sale):
        with self._conn.cursor() as cur:
            cur.execute(Sale.UPDATE, sale.to_dict())
