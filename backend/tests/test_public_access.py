"""Access-contract tests for safe public information and private analytics."""
import os
import unittest

os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret")

from app import app
from model import db, User
from werkzeug.security import generate_password_hash


class PublicAccessTests(unittest.TestCase):
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
            db.session.add_all([
                User(full_name="Student", email="student@example.com", role="student",
                     password_hash=generate_password_hash("secure-student-pass")),
                User(full_name="Admin", email="admin@example.com", role="admin",
                     password_hash=generate_password_hash("secure-admin-pass")),
            ])
            db.session.commit()
        self.client = app.test_client()

    def login(self, email, password):
        return self.client.post("/auth/login", json={"email": email, "password": password}).get_json()["access"]

    def test_safe_shared_information_is_public(self):
        self.assertEqual(self.client.get("/api/notices").status_code, 200)
        self.assertEqual(self.client.get("/api/mess").status_code, 200)
        self.assertEqual(self.client.get("/api/timetable").status_code, 200)
        self.assertEqual(self.client.get("/api/medical/doctors").status_code, 200)

    def test_analytics_is_admin_only(self):
        self.assertIn(self.client.get("/api/analytics").status_code, (401, 422))
        student_token = self.login("student@example.com", "secure-student-pass")
        self.assertEqual(
            self.client.get("/api/analytics", headers={"Authorization": f"Bearer {student_token}"}).status_code,
            403,
        )
        admin_token = self.login("admin@example.com", "secure-admin-pass")
        self.assertEqual(
            self.client.get("/api/analytics", headers={"Authorization": f"Bearer {admin_token}"}).status_code,
            200,
        )
