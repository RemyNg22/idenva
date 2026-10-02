import webbrowser
from threading import Timer
import uvicorn
from app.main import app


def open_browser():
    webbrowser.open("http://127.0.0.1:8000")


if __name__ == "__main__":
    Timer(1.5, open_browser).start()

    # Démarre le serveur local Uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")