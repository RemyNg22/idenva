import sys
import os
import webbrowser
from threading import Timer
import uvicorn
from app.main import app

if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")


def open_browser():
    webbrowser.open("http://127.0.0.1:8000")


if __name__ == "__main__":
    Timer(1.5, open_browser).start()

    uvicorn.run(app, host="127.0.0.1", port=8000, log_config=None)