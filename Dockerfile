# BirAye — production image
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Application code
COPY src ./src
COPY frontend ./frontend

# Quran text/audio cache and the SQLite DB are created here at runtime
# (data/cache + data/biraye.db). Mount a volume here for persistence.
RUN mkdir -p /app/data

EXPOSE 8000

# Render (and most PaaS) inject $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn biraye.app:app --host 0.0.0.0 --port ${PORT:-8000} --app-dir src"]
