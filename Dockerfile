FROM python:3.9

# Setup env
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONFAULTHANDLER=1

# Set up working directory
WORKDIR /celadon

# Install dependencies
# XXX: Copy only Pipfile & Pipfile.lock first to take
#      advantage of Docker build cache
COPY Pipfile* ./
RUN pip install pipenv
RUN pipenv install --system --deploy

# Bundle source code
COPY . .

# Run the server
ENTRYPOINT ["gunicorn", "celadon.server:server"]
