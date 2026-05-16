FROM python:3.13-slim AS builder

ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_NO_CACHE=1 \
    PATH="/opt/poetry/bin:$PATH"
RUN python3 -m venv /opt/poetry && \
    /opt/poetry/bin/pip install --no-cache-dir poetry==2.3.2

WORKDIR /celadon

COPY pyproject.toml poetry.lock ./
RUN poetry install --with migrate --without dev --no-root

COPY celadon/ ./celadon/
COPY README.md ./

RUN poetry install --with migrate --without dev

# Fix Python symlinks to match distroless Python path
RUN rm -f /celadon/.venv/bin/python* && \
    ln -s /usr/bin/python /celadon/.venv/bin/python && \
    ln -s /usr/bin/python /celadon/.venv/bin/python3 && \
    ln -s /usr/bin/python /celadon/.venv/bin/python3.13

FROM gcr.io/distroless/python3-debian13 AS runtime

WORKDIR /celadon

COPY yoyo.ini ./
COPY migrations/ ./migrations/
COPY --from=builder /celadon/.venv /celadon/.venv
COPY --from=builder /celadon/celadon /celadon/celadon

ENV CELADON_MIGRATIONS_DIR=/celadon/migrations

ENTRYPOINT ["/celadon/.venv/bin/celadon-migrate"]
CMD ["apply"]
