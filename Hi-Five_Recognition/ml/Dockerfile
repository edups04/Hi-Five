# Dockerfile for the Hi-Five Flask ML server.
#
# Why a Dockerfile (not Railway's auto-detect): mediapipe and opencv have
# native dependencies (libGL, libglib, etc) that aren't in Railway's default
# Python image. Pinning a Dockerfile makes the deploy reproducible.

FROM python:3.11-slim

# System dependencies needed by mediapipe and opencv-python.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so they get cached when only app code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Then the app code (excluding what's in .dockerignore).
COPY . .

# Railway will set PORT in the environment; default to 3001 for local docker run.
ENV PORT=3001
EXPOSE 3001

# Run the Flask app. app.py reads $PORT correctly already.
CMD ["python", "app.py"]
