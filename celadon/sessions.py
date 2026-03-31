import pickle
import uuid
from datetime import datetime, timezone

from flask.sessions import SessionInterface, SessionMixin
from werkzeug.datastructures import CallbackDict


class PostgresSession(CallbackDict, SessionMixin):
    def __init__(self, initial=None, sid=None, new=False):
        def on_update(self):
            self.modified = True

        super().__init__(initial or {}, on_update)
        self.sid = sid
        self.new = new
        self.modified = False


class PostgresSessionInterface(SessionInterface):
    def __init__(self, database):
        self._db = database

    def open_session(self, app, request):
        sid = request.cookies.get(self.get_cookie_name(app))
        if not sid:
            return PostgresSession(sid=str(uuid.uuid4()), new=True)
        raw = self._db.get_session(sid)
        if raw is None:
            return PostgresSession(sid=str(uuid.uuid4()), new=True)
        return PostgresSession(pickle.loads(bytes(raw)), sid=sid)

    def save_session(self, app, session, response):
        name = self.get_cookie_name(app)
        domain = self.get_cookie_domain(app)
        path = self.get_cookie_path(app)
        secure = self.get_cookie_secure(app)
        samesite = self.get_cookie_samesite(app)
        httponly = self.get_cookie_httponly(app)

        if not session:
            if session.modified:
                self._db.delete_session(session.sid)
                response.delete_cookie(name, domain=domain, path=path)
            return

        if not self.should_set_cookie(app, session):
            return

        expiry = self.get_expiration_time(app, session) or (
            datetime.now(timezone.utc) + app.permanent_session_lifetime
        )
        self._db.upsert_session(session.sid, pickle.dumps(dict(session)), expiry)
        response.set_cookie(
            name,
            session.sid,
            expires=expiry,
            httponly=httponly,
            domain=domain,
            path=path,
            secure=secure,
            samesite=samesite,
        )
