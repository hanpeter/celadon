from contextlib import contextmanager, nullcontext

from psycopg.rows import dict_row

from celadon.models import Customer, Item, Purchase, Purchaser, Sale, User


class Database:
    def __init__(self, pool):
        self._pool = pool

    @contextmanager
    def transaction(self):
        with self._pool.connection() as conn:
            yield conn

    def get_purchasers(self):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(Purchaser.SELECT_ALL)
                return [Purchaser.model_validate(row) for row in cur]

    def get_purchaser(self, id):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(Purchaser.SELECT_ONE, [id])
                row = cur.fetchone()
                return Purchaser.model_validate(row) if row else None

    def add_purchaser(self, purchaser, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Purchaser.INSERT, purchaser.model_dump())
                return cur.fetchone()[0]

    def update_purchaser(self, purchaser, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Purchaser.UPDATE, purchaser.model_dump())

    def get_purchases(self):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(Purchase.SELECT_ALL)
                return [Purchase.model_validate(row) for row in cur]

    def get_purchase(self, id):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(Purchase.SELECT_ONE, [id])
                row = cur.fetchone()
                return Purchase.model_validate(row) if row else None

    def add_purchase(self, purchase, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Purchase.INSERT, purchase.model_dump())
                return cur.fetchone()[0]

    def update_purchase(self, purchase, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Purchase.UPDATE, purchase.model_dump())

    def get_items(self):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(Item.SELECT_ALL)
                return [Item.model_validate(row) for row in cur]

    def get_item(self, id):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(Item.SELECT_ONE, [id])
                row = cur.fetchone()
                return Item.model_validate(row) if row else None

    def add_item(self, item, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Item.INSERT, item.model_dump())
                return cur.fetchone()[0]

    def update_item(self, item, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Item.UPDATE, item.model_dump())

    def get_customers(self):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(Customer.SELECT_ALL)
                return [Customer.model_validate(row) for row in cur]

    def get_customer(self, id):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(Customer.SELECT_ONE, [id])
                row = cur.fetchone()
                return Customer.model_validate(row) if row else None

    def add_customer(self, customer, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Customer.INSERT, customer.model_dump())
                return cur.fetchone()[0]

    def update_customer(self, customer, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Customer.UPDATE, customer.model_dump())

    def get_sales(self):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(Sale.SELECT_ALL)
                return [Sale.model_validate(row) for row in cur]

    def get_sale(self, id):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(Sale.SELECT_ONE, [id])
                row = cur.fetchone()
                return Sale.model_validate(row) if row else None

    def add_sale(self, sale, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Sale.INSERT, sale.model_dump(exclude={'status'}))
                return cur.fetchone()[0]

    def update_sale(self, sale, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Sale.UPDATE, sale.model_dump(exclude={'status'}))

    def delete_sale(self, id, conn=None):
        with (nullcontext(conn) if conn is not None else self._pool.connection()) as conn:
            with conn.cursor() as cur:
                cur.execute(Sale.DELETE, [id])

    def get_user_by_email(self, email):
        with self._pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(User.SELECT_ONE_BY_EMAIL, [email])
                row = cur.fetchone()
                return User.model_validate(row) if row else None

    def get_session(self, sid):
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT data FROM sessions WHERE id = %s AND expiry > NOW()',
                    [sid],
                )
                row = cur.fetchone()
        return row[0] if row else None

    def upsert_session(self, sid, data, expiry):
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    '''
                    INSERT INTO sessions (id, data, expiry) VALUES (%s, %s, %s)
                    ON CONFLICT (id) DO UPDATE
                        SET data = EXCLUDED.data, expiry = EXCLUDED.expiry
                    ''',
                    [sid, data, expiry],
                )

    def delete_session(self, sid):
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM sessions WHERE id = %s', [sid])
