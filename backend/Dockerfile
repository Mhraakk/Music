# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# --- Runtime ---
FROM base AS runner
RUN groupadd --system --gid 1001 appuser \
    && useradd --system --uid 1001 --gid appuser appuser

COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

COPY app ./app
COPY data ./data

RUN mkdir -p /app/var/files && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
ENV PORT=8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
