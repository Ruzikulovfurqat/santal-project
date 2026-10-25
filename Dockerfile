FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
COPY bot/requirements.txt bot/
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8642

# FastAPI сервер + Телеграм бот (polling) битта жараёнда;
# ишга тушишда миграциялар автоматик қўлланади
CMD ["python", "app.py"]
