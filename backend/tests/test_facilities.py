"""Public facilities and admin-only status update tests."""
import os
import unittest

os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret")

from app import app
from model import db, User
from werkzeug.security import generate_password_hash


class FacilityTests(unittest.TestCase):
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
                User(full_name="Admin", email="admin@example.com", role="admin", password_hash=generate_password_hash("admin-pass-123")),
                User(full_name="Student", email="student@example.com", role="student", password_hash=generate_password_hash("student-pass-123")),
            ])
            db.session.commit()
        self.client = app.test_client()

    def token(self, email, password):
        return self.client.post("/auth/login", json={"email": email, "password": password}).get_json()["access"]

    def test_facilities_are_public_and_seeded(self):
        response = self.client.get("/api/facilities")
        self.assertEqual(response.status_code, 200)
        facilities = response.get_json()
        self.assertEqual(len(facilities), 7)
        self.assertEqual(facilities[1]["location"], "9th floor")

    def test_only_admin_can_update_a_facility_status(self):
        facility_id = self.client.get("/api/facilities").get_json()[0]["id"]
        student_token = self.token("student@example.com", "student-pass-123")
        self.assertEqual(self.client.put(
            f"/api/facilities/{facility_id}",
            headers={"Authorization": f"Bearer {student_token}"}, json={"status": "Available"},
        ).status_code, 403)
        admin_token = self.token("admin@example.com", "admin-pass-123")
        response = self.client.put(
            f"/api/facilities/{facility_id}",
            headers={"Authorization": f"Bearer {admin_token}"}, json={"status": "Available"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "Available")
