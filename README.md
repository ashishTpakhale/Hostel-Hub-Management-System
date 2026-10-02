# 🏠 Hostel Hub – Smart Hostel Management System

**Live Demo:** [https://hostel-hub-management-system-yzo8.onrender.com/](https://hostel-hub-management-system-yzo8.onrender.com/)
**Backend API:** Hosted on Railway
**Frontend:** React + Vite

---

## 📖 Overview

**Hostel Hub** is a complete hostel management platform designed for students, admins, and repair staff. It simplifies day-to-day operations — from issue reporting and notice updates to bus timetables and medical records — through a centralized web dashboard.

The system supports **JWT-based authentication**, **role-specific dashboards**, and **seamless communication** among users.

---

## 🚀 Features

### 👩‍🎓 Student

* View notices and announcements
* Raise and track maintenance issues
* Access bus timetables and medical services

### 🧑‍🔧 Repairer

* View and manage assigned repair tasks
* Update issue status in real-time

### 🧑‍💼 Admin

* Post and manage notices
* Assign repairers to reported issues
* Manage doctors, students, and timetables

---

## ⚙️ Tech Stack

**Frontend:**

* React (Vite)
* React Router
* Tailwind CSS
* shadcn/ui components

**Backend:**

* Flask (Python)
* Flask-JWT-Extended
* Flask-CORS
* SQLAlchemy + SQLite
* Render (for frontend)
* Railway (for backend)

---

## Portfolio highlights

* JWT-based authentication with student, admin, and worker roles.
* Protected dashboards for maintenance issues, notices, mess schedules, medical records, and bus timetables.
* Server-side authorization prevents issue-creator impersonation, restricts workers to their assigned issues, and limits timetable changes to administrators.
* Environment-driven setup supports local development through the Vite proxy and deployment through configuration.
* Authentication smoke tests provide a repeatable regression check.

### Role provisioning

The application has three roles: `student`, `admin`, and `worker`. Students self-register.
For a first local demo, set the optional `ADMIN_*` and `BOOTSTRAP_WORKER_*` values in
`backend/.env`, then restart Flask. In normal operation, an authenticated admin creates
additional workers from the Admin dashboard; the backend enforces the role for that route.

---

## Screenshot

<img width="1852" height="934" alt="image" src="https://github.com/user-attachments/assets/6b5e95d5-e0b7-4121-be1d-d6c686b8c3ae" />

<img width="1852" height="934" alt="image" src="https://github.com/user-attachments/assets/091a9724-eebf-477e-838b-7e9d5ef79816" />

---

## 🔐 Authentication

* **JWT (JSON Web Token)** is used for secure and stateless authentication.
* Users are authorized based on their roles (Student / Admin / Repairer).

---

## 🧠 Architecture

```
Frontend (React) → REST API (Flask) → Database (SQLite)
```

The system follows a clean separation between frontend and backend, communicating via secure API routes.

---

## 🧰 Setup Instructions

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # on Linux/Mac
# or .\.venv\Scripts\activate on Windows

pip install -r requirements.txt
# Windows PowerShell: Copy-Item .env.example .env
# Then set JWT_SECRET_KEY in .env to a long random value.
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit:

* **Frontend:** `http://localhost:8080`
* **Backend API:** `http://localhost:5000`

### Configuration

Use `backend/.env.example` as the template for backend secrets and allowed browser origins.
Use `frontend/.env.example` to set `VITE_API_BASE_URL` for a deployed frontend; leave
it empty locally so Vite proxies requests to Flask. Never commit real `.env` files.

### Tests

```bash
cd backend
python -m unittest discover -s tests
```
