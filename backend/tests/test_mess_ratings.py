"""Tests for dated mess menus and one-rating-per-student policy."""
import os
import unittest

os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret")

from app import app
from model import db, User
from werkzeug.security import generate_password_hash


class MessRatingTests(unittest.TestCase):
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
        response = self.client.post("/auth/login", json={"email": email, "password": password})
        return response.get_json()["access"]

    def test_student_can_rate_a_published_meal_once(self):
        admin_token = self.token("admin@example.com", "admin-pass-123")
        create = self.client.post(
            "/api/mess/daily",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"date": "2026-10-03", "mealType": "dinner", "menuText": "Dal, rice, salad"},
        )
        self.assertEqual(create.status_code, 200)
        meal_id = create.get_json()["id"]

        self.assertEqual(self.client.get("/api/mess/daily?date=2026-10-03").status_code, 200)
        student_token = self.token("student@example.com", "student-pass-123")
        rate = self.client.post(
            f"/api/mess/daily/{meal_id}/ratings",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"rating": 4},
        )
        self.assertEqual(rate.status_code, 201)
        self.assertEqual(rate.get_json()["averageRating"], 4.0)
        self.assertEqual(rate.get_json()["ratingCount"], 1)

        duplicate = self.client.post(
            f"/api/mess/daily/{meal_id}/ratings",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"rating": 5},
        )
        self.assertEqual(duplicate.status_code, 409)

    def test_only_admin_can_publish_daily_meals(self):
        student_token = self.token("student@example.com", "student-pass-123")
        response = self.client.post(
            "/api/mess/daily",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"date": "2026-10-03", "mealType": "lunch", "menuText": "Rice"},
        )
        self.assertEqual(response.status_code, 403)
