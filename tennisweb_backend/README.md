# TennisApp backend

This Django project provides a simple REST API for the TennisApp iOS frontend. It includes JWT authentication (Simple JWT), user registration, and a profile endpoint.

## Setup (local development)

1. Create and activate a virtual environment (recommended):

   python3 -m venv .venv
   source .venv/bin/activate

2. Install dependencies:

   pip install -r requirements.txt

3. Apply migrations and create a superuser:

   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser

4. Run the development server:

   python manage.py runserver

The API will be available at http://127.0.0.1:8000/api/

## Endpoints

- POST /api/register/  -> register new user (username, email, password)
- POST /api/token/     -> obtain JWT tokens (username, password) -> returns { access, refresh }
- POST /api/token/refresh/ -> refresh access token (refresh)
- GET  /api/profile/   -> current user profile (requires Authorization: Bearer <access>)

## Swift frontend example

Use the existing `TennisApp/Services/APIService.swift`. Example flows:

- Register: POST to `/api/register/` with { username, email, password } -> returns user JSON.
- Login: POST to `/api/token/` with { username, password } -> returns { access, refresh }. Store `access` as Authorization header `Bearer <access>`.
- Get profile: GET `/api/profile/` with Authorization header -> returns user data.

Adjust `APIService.swift` `baseURL` to point to your server (for simulator use http://127.0.0.1:8000 if enabling App Transport Security exceptions or use your machine IP).
