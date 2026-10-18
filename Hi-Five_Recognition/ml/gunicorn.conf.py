"""
Gunicorn configuration for the Hi-Five ML service.

Railway runs the Custom Start Command without a shell, so "$PORT" written on
the command line reaches gunicorn as a literal string rather than the port
number. Reading the environment variable here in Python sidesteps that.

Gunicorn picks this file up automatically when it sits in the working
directory, so the start command is simply:

    gunicorn app:app
"""

import os

bind = f"0.0.0.0:{os.getenv('PORT', '3001')}"

# One worker only.
#
# Each worker is a separate process with its own copy of the TCN frame buffer.
# With two workers your frames would alternate between two half-filled buffers
# and no sign would ever complete. Threads are fine because app.py serialises
# access to the predictor with a lock.
workers = 1
threads = 4

# Loading MediaPipe, two XGBoost models and the TCN takes a while on a shared
# vCPU, and a single frame can be slow under load. Keep gunicorn patient.
timeout = 120
graceful_timeout = 30

# Access logging is off: at 12fps every prediction would be its own log line,
# which floods the Railway log view and costs throughput. Errors still log.
accesslog = None
errorlog = "-"
loglevel = "info"
