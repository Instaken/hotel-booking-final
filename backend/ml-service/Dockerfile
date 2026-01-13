# Use Python slim image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy training script and dataset
COPY train_model.py .
COPY hotel_booking.csv* ./

# Create models directory
RUN mkdir -p /app/models

# Train model if dataset exists, otherwise create placeholder
RUN if [ -f "hotel_booking.csv" ]; then \
        python train_model.py; \
    else \
        echo "No dataset found, model will use fallback predictions"; \
    fi

# Copy application code
COPY app.py .

# Set environment variables
ENV PORT=8080
ENV MODEL_PATH=/app/models
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8080

# Run with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--threads", "4", "app:app"]
