FROM python:3.11-slim

WORKDIR /app

# Only install basic requirements (no AI models)
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn==0.24.0 \
    pydantic==2.5.0 \
    websockets==12.0

# Copy code
COPY demo.py .
COPY main.py .

EXPOSE 8000

# Run demo mode
CMD ["python", "demo.py"]
