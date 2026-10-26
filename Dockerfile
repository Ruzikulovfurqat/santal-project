FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock

COPY . .

EXPOSE 8642

# FastAPI сервер + Телеграм бот (polling) битта жараёнда;
# ишга тушишда миграциялар автоматик қўлланади
CMD ["python", "app.py"]
