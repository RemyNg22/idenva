import os
import sys
import threading
import time

import uvicorn

if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

if getattr(sys, "frozen", False):
    base_dir = sys._MEIPASS
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, base_dir)

from app.main import app
from app.config import settings


def _process_alive(pid: int) -> bool:
    if os.name == "nt":
        import ctypes
        SYNCHRONIZE = 0x00100000
        h = ctypes.windll.kernel32.OpenProcess(SYNCHRONIZE, False, pid)
        if not h:
            return False
        try:
            return ctypes.windll.kernel32.WaitForSingleObject(h, 0) == 0x102  # WAIT_TIMEOUT
        finally:
            ctypes.windll.kernel32.CloseHandle(h)
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _exit_when_parent_dies(pid: int) -> None:
    while _process_alive(pid):
        time.sleep(1)
    os._exit(0)


if __name__ == "__main__":
    parent = os.environ.get("IDENVA_PARENT_PID", "")
    if parent.isdigit():
        threading.Thread(target=_exit_when_parent_dies, args=(int(parent),), daemon=True).start()
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="error", log_config=None)