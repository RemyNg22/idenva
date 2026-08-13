#!/bin/bash
set -e

cd backend

if [ ! -d "venv" ]; then
    echo "Creation de l'environnement virtuel..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installation des dependances..."
pip install -r requirements.txt -q

echo "Demarrage du serveur Idenva sur http://127.0.0.1:8000 ..."
uvicorn app.main:app --reload