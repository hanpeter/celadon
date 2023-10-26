FROM python:3.11-alpine@sha256:537b7980bc438b55f3a27806e034ba50cb8e45338596e3b1928e6b25c1169a60 as builder

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

FROM python:3.11-alpine@sha256:537b7980bc438b55f3a27806e034ba50cb8e45338596e3b1928e6b25c1169a60 as runner

# Set up working directory
WORKDIR /celadon

# Setup environment
ENV PATH="/celadon/.venv/bin:$PATH"

# Copy the source code
COPY --from=builder /celadon/.venv ./.venv
COPY celadon ./celadon

# Run the server
ENTRYPOINT ["gunicorn", "celadon.server:server"]
