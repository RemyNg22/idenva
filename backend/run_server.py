import sys
import os
import uvicorn
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.config import settings

if __name__ == "__main__":
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="error")