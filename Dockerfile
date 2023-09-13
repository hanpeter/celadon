FROM python:3.11-alpine@sha256:5d769f990397afbb2aca24b0655e404c0f2806d268f454b052e81e39d87abf42 as builder

# Set up working directory
WORKDIR /celadon

# Set up Poetry
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_NO_CACHE=1
RUN pip install poetry==1.6.1

# Install dependencies
COPY pyproject.toml poetry.lock README.md ./
RUN poetry install --without dev --no-root

FROM python:3.11-alpine@sha256:5d769f990397afbb2aca24b0655e404c0f2806d268f454b052e81e39d87abf42 as runner

# Set up working directory
WORKDIR /celadon

# Setup environment
ENV PATH="/celadon/.venv/bin:$PATH"

# Copy the source code
COPY --from=builder /celadon/.venv ./.venv
COPY celadon ./celadon

# Run the server
ENTRYPOINT ["gunicorn", "celadon.server:server"]
