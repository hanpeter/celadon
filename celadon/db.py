from celadon.models import Customer, Item, Purchase, Purchaser, Sale, User


class Database:
    def __init__(self, connection):
        self._conn = connection

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

    def get_user_by_email(self, email):
        with self._conn.cursor() as cur:
            cur.execute(User.SELECT_ONE_BY_EMAIL, [email])
            row = cur.fetchone()
            return User(*row) if row else None

    def get_session(self, sid):
        with self._conn.cursor() as cur:
            cur.execute(
                'SELECT data FROM sessions WHERE id = %s AND expiry > NOW()',
                [sid],
            )
            row = cur.fetchone()
        return row[0] if row else None

    def upsert_session(self, sid, data, expiry):
        with self._conn.cursor() as cur:
            cur.execute(
                '''
                INSERT INTO sessions (id, data, expiry) VALUES (%s, %s, %s)
                ON CONFLICT (id) DO UPDATE
                    SET data = EXCLUDED.data, expiry = EXCLUDED.expiry
                ''',
                [sid, data, expiry],
            )

    def delete_session(self, sid):
        with self._conn.cursor() as cur:
            cur.execute('DELETE FROM sessions WHERE id = %s', [sid])
