import sys
import os
import uvicorn

if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, base_dir)

from app.main import app
from app.config import settings

if __name__ == "__main__":
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="error")