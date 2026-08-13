@echo off
cd backend

if not exist venv (
    echo Creation de l'environnement virtuel...
    python -m venv venv
)

call venv\Scripts\activate

echo Installation des dependances...
pip install -r requirements.txt -q

echo Demarrage du serveur Idenva sur http://127.0.0.1:8000 ...
uvicorn app.main:app --reload

pause