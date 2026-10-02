"""Smoke tests for the authentication contract.

Run from the backend directory with: python -m unittest discover -s tests
"""
import os
import unittest

os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret")

from app import app
from model import db, User, WorkerInfo
from werkzeug.security import generate_password_hash


class AuthenticationApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True, SQLALCHEMY_DATABASE_URI="sqlite://")
        with app.app_context():
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()

    def setUp(self):
        with app.app_context():
            db.drop_all()
            db.create_all()
        self.client = app.test_client()

    def test_signup_returns_a_ready_session(self):
        response = self.client.post(
            "/auth/signup",
            json={
                "full_name": "Test Student",
                "email": "student@example.com",
                "password": "secure-pass-123",
                "roomNo": "101",
            },
        )
        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertIn("access", payload)
        self.assertEqual(payload["user"]["email"], "student@example.com")

    def test_signup_rejects_short_passwords(self):
        response = self.client.post(
            "/auth/signup",
            json={"full_name": "Test", "email": "short@example.com", "password": "short"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Password", response.get_json()["error"])

    def test_admin_can_provision_a_worker(self):
        with app.app_context():
            admin = User(
                full_name="Admin",
                email="admin@example.com",
                password_hash=generate_password_hash("secure-admin-pass"),
                role="admin",
            )
            db.session.add(admin)
            db.session.commit()

        login = self.client.post(
            "/auth/login",
            json={"email": "admin@example.com", "password": "secure-admin-pass"},
        )
        access_token = login.get_json()["access"]
        response = self.client.post(
            "/auth/create-worker",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "full_name": "Electrician",
                "email": "worker@example.com",
                "password": "secure-worker-pass",
                "worker_type": "Electrical",
            },
        )
        self.assertEqual(response.status_code, 201)
        with app.app_context():
            self.assertEqual(User.query.filter_by(role="worker").count(), 1)
            self.assertEqual(WorkerInfo.query.count(), 1)
