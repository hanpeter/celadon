# -*- coding: utf-8 -*-

import os
import psycopg2
from src.models import Purchaser, Purchase, Item


class Database(object):
    def __init__(self):
        self._conn = psycopg2.connect(dsn=os.environ.get('DATABASE_URL'))
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
