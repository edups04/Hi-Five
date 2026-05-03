# Dockerfile for the Hi-Five Flask ML server.
#
# Why a Dockerfile (not Railway's auto-detect): mediapipe and opencv have
# native dependencies (libGL, libGLES, libglib, etc) that aren't in
# Railway's default Python image. Pinning a Dockerfile makes it reproducible.

FROM python:3.11-slim

# System dependencies needed by mediapipe + opencv-python.
# - libgl1 / libglx-mesa0: OpenGL desktop bits
# - libgles2 / libegl1: OpenGL ES (newer mediapipe versions need these)
# - libglib2.0-0, libsm6, libxext6, libxrender1: opencv display deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglx-mesa0 \
    libgles2 \
    libegl1 \
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

# Run the Flask app. app.py reads $PORT correctly.
CMD ["python", "app.py"]