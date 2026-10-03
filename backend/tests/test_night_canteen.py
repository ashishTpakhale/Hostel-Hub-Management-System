"""Night Canteen public access, verified contribution, and manager controls."""
import io
import json
import os
import tempfile
import unittest

os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret")
from app import app
from model import db, User
from werkzeug.security import generate_password_hash


class NightCanteenTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.upload_dir = tempfile.mkdtemp()
        app.config.update(TESTING=True, SQLALCHEMY_DATABASE_URI="sqlite://", NIGHT_CANTEEN_UPLOAD_DIR=cls.upload_dir)
        with app.app_context(): db.create_all()

    @classmethod
    def tearDownClass(cls):
        with app.app_context(): db.session.remove(); db.drop_all(); db.engine.dispose()

    def setUp(self):
        with app.app_context():
            db.drop_all(); db.create_all()
            db.session.add_all([
                User(full_name="Admin", email="admin@example.com", role="admin", password_hash=generate_password_hash("admin-pass-123")),
                User(full_name="Verified", email="student@iiitn.ac.in", role="student", password_hash=generate_password_hash("student-pass-123")),
                User(full_name="Other", email="other@example.com", role="student", password_hash=generate_password_hash("other-pass-123")),
            ]); db.session.commit()
        self.client = app.test_client()

    def token(self, email, password): return self.client.post("/auth/login", json={"email": email, "password": password}).get_json()["access"]

    def test_verified_student_can_draft_and_publish_manual_menu(self):
        token = self.token("student@iiitn.ac.in", "student-pass-123")
        created = self.client.post("/api/night-canteen/contributions", headers={"Authorization": f"Bearer {token}"}, data={
            "date": "2026-10-03", "items": json.dumps([{"name": "Maggi", "price": 50}]),
            "image": (io.BytesIO(b"fake image"), "menu.png", "image/png"),
        })
        self.assertEqual(created.status_code, 201)
        menu_id = created.get_json()["id"]
        self.assertEqual(self.client.get("/api/night-canteen/menus?date=2026-10-03").get_json(), [])
        published = self.client.post(f"/api/night-canteen/contributions/{menu_id}/publish", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(published.status_code, 200)
        self.assertEqual(self.client.get("/api/night-canteen/menus?date=2026-10-03").get_json()[0]["items"][0]["name"], "Maggi")

    def test_non_college_student_cannot_contribute_and_manager_can_mark_sold_out(self):
        other_token = self.token("other@example.com", "other-pass-123")
        denied = self.client.post("/api/night-canteen/contributions", headers={"Authorization": f"Bearer {other_token}"}, data={"date": "2026-10-03", "items": "[]"})
        self.assertEqual(denied.status_code, 403)
        contributor = self.token("student@iiitn.ac.in", "student-pass-123")
        created = self.client.post("/api/night-canteen/contributions", headers={"Authorization": f"Bearer {contributor}"}, data={"date": "2026-10-03", "items": json.dumps([{"name": "Tea", "price": 15}])})
        menu_id = created.get_json()["id"]
        self.client.post(f"/api/night-canteen/contributions/{menu_id}/publish", headers={"Authorization": f"Bearer {contributor}"})
        item_id = self.client.get("/api/night-canteen/menus?date=2026-10-03").get_json()[0]["items"][0]["id"]
        admin = self.token("admin@example.com", "admin-pass-123")
        updated = self.client.put(f"/api/night-canteen/items/{item_id}", headers={"Authorization": f"Bearer {admin}"}, json={"isAvailable": False})
        self.assertEqual(updated.status_code, 200); self.assertFalse(updated.get_json()["isAvailable"])
