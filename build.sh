#!/usr/bin/env bash
# Render.com build script — installs Python deps + builds React frontend
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

cd frontend
npm install
npm run build
cd ..
