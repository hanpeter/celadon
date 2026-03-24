FROM python:3.13-slim AS builder

# Install Poetry
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_NO_CACHE=1 \
    PATH="/opt/poetry/bin:$PATH"
RUN python3 -m venv /opt/poetry && \
    /opt/poetry/bin/pip install --no-cache-dir poetry==2.3.2

# Set up working directory
WORKDIR /celadon

# Install dependencies
COPY pyproject.toml poetry.lock README.md ./
RUN poetry install --without dev --no-root

# Copy application code and README
COPY celadon/ ./celadon/
COPY README.md ./

# Install application
RUN poetry install --without=dev

# Fix Python symlinks in venv to point to distroless Python 3.11
RUN rm -f /celadon/.venv/bin/python* && \
    ln -s /usr/bin/python /celadon/.venv/bin/python && \
    ln -s /usr/bin/python /celadon/.venv/bin/python3 && \
    ln -s /usr/bin/python /celadon/.venv/bin/python3.13

FROM gcr.io/distroless/python3-debian13 AS runtime

# Set up working directory
WORKDIR /celadon

# Copy virtual environment from builder
COPY --from=builder /celadon/.venv /celadon/.venv
COPY --from=builder /celadon/celadon /celadon/celadon

# Run the server
ENTRYPOINT ["/celadon/.venv/bin/gunicorn", "celadon.server:server"]
