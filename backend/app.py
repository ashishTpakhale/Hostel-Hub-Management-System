import os
import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, jwt_required
from model import db, User, Notice, WorkerInfo, Issue, Doctor, StudentMedical
from sqlalchemy import func
from auth import auth_bp
from issues import issues_bp
from notice import notices_bp
from dotenv import load_dotenv
from workers import workers_bp
from mess import mess_bp
from werkzeug.security import generate_password_hash, check_password_hash
from bus_timetable import bus_bp
from medical import medical_bp
import requests
import json
import re

load_dotenv()

app = Flask(__name__)
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:8080,https://hostel-hub-management-system-yzo8.onrender.com",
    ).split(",")
    if origin.strip()
]
CORS(app, supports_credentials=True, expose_headers=["Authorization"], origins=allowed_origins)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(basedir, "database.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

jwt_secret = os.getenv("JWT_SECRET_KEY")
if not jwt_secret:
    raise RuntimeError("JWT_SECRET_KEY is required. Copy backend/.env.example to backend/.env and set a secret.")
app.config["JWT_SECRET_KEY"] = jwt_secret
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(minutes=2000)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = datetime.timedelta(days=7)

db.init_app(app)
Migrate(app, db)
JWTManager(app)

app.register_blueprint(auth_bp)
app.register_blueprint(workers_bp)
app.register_blueprint(issues_bp)
app.register_blueprint(notices_bp)
app.register_blueprint(mess_bp)
app.register_blueprint(bus_bp)
app.register_blueprint(medical_bp)

@app.get("/api/categories")
def get_categories():
    return jsonify([
        {"id": "1", "name": "Room Cleaning"},
        {"id": "2", "name": "Water Complaint"},
        {"id": "3", "name": "Internet"},
        {"id": "4", "name": "Furniture"},
        {"id": "5", "name": "Electronics"},
        {"id": "6", "name": "Washroom"},
        {"id": "7", "name": "Others"},
    ])

@app.route('/api/analytics')
def analytics():
    total_users = int(db.session.query(func.count(User.id)).scalar() or 0)
    total_students = int(db.session.query(func.count(User.id)).filter(User.role == 'student').scalar() or 0)
    total_staff = int(db.session.query(func.count(User.id)).filter(User.role != 'student').scalar() or 0)
    total_workers = int(db.session.query(func.count(WorkerInfo.id)).scalar() or 0)

    total_notices = int(db.session.query(func.count(Notice.id)).scalar() or 0)
    total_doctors = int(db.session.query(func.count(Doctor.id)).scalar() or 0)
    doctors_available_today = int(db.session.query(func.count(Doctor.id)).filter(Doctor.available_today == True).scalar() or 0)
    student_medical = int(db.session.query(func.count(StudentMedical.id)).scalar() or 0)

    issues_by_status_q = db.session.query(Issue.status, func.count(Issue.id)).group_by(Issue.status).all()
    issues_by_status = [{'status': s or 'Unknown', 'count': int(c)} for s, c in issues_by_status_q]

    today = datetime.date.today()
    start = today - datetime.timedelta(days=29)

    issues_30_q = db.session.query(func.date(Issue.created_at), func.count(Issue.id)) \
        .filter(Issue.created_at >= start) \
        .group_by(func.date(Issue.created_at)) \
        .order_by(func.date(Issue.created_at)).all()

    date_map = {}
    for d, c in issues_30_q:
        if d is None:
            continue
        if hasattr(d, "isoformat"):
            key = d.isoformat()
        else:
            key = str(d)
        date_map[key] = int(c)

    issues_last_30_days = []
    for i in range(30):
        dd = start + datetime.timedelta(days=i)
        key = dd.isoformat()
        issues_last_30_days.append({'date': key, 'count': date_map.get(key, 0)})

    try:
        first_month = (today.replace(day=1) - datetime.timedelta(days=365)).replace(day=1)
        notices_q = db.session.query(func.strftime('%Y-%m', Notice.created_at), func.count(Notice.id)) \
            .filter(Notice.created_at >= first_month) \
            .group_by(func.strftime('%Y-%m', Notice.created_at)) \
            .order_by(func.strftime('%Y-%m', Notice.created_at)).all()
        notices_last_12_months = [{'month': m, 'count': int(c)} for m, c in notices_q]
    except Exception:
        first_month = (today.replace(day=1) - datetime.timedelta(days=365)).replace(day=1)
        notices_q = db.session.query(func.to_char(Notice.created_at, 'YYYY-MM'), func.count(Notice.id)) \
            .filter(Notice.created_at >= first_month) \
            .group_by(func.to_char(Notice.created_at, 'YYYY-MM')) \
            .order_by(func.to_char(Notice.created_at, 'YYYY-MM')).all()
        notices_last_12_months = [{'month': m, 'count': int(c)} for m, c in notices_q]

    top_reporters_q = db.session.query(Issue.created_by, func.count(Issue.id)) \
        .group_by(Issue.created_by) \
        .order_by(func.count(Issue.id).desc()) \
        .limit(10).all()
    top_reporters = [{'reporter': (r or 'Unknown'), 'count': int(c)} for r, c in top_reporters_q]

    totals = {
        'users': total_users,
        'students': total_students,
        'staff': total_staff,
        'workers': total_workers,
        'open_issues': int(db.session.query(func.count(Issue.id)).filter(Issue.status == 'Pending').scalar() or 0),
        'inprogress_issues': int(db.session.query(func.count(Issue.id)).filter(Issue.status == 'In Progress').scalar() or 0),
        'resolved_issues': int(db.session.query(func.count(Issue.id)).filter(Issue.status == 'Resolved').scalar() or 0),
        'notices': total_notices,
        'doctors': total_doctors,
        'doctors_available_today': doctors_available_today,
        'student_medical_records': student_medical,
    }

    series = {
        'issues_last_30_days': issues_last_30_days,
        'notices_last_12_months': notices_last_12_months,
        'issues_by_status': issues_by_status,
        'top_reporters': top_reporters,
    }

    return jsonify({'totals': totals, 'series': series})

@app.route('/analyze_issue', methods=['POST'])
@jwt_required()
def analyze_issue():
    API_KEY = os.getenv("API_KEY")
    ENDPOINT = "https://api.perplexity.ai/chat/completions"

    try:
        data = request.get_json()
        title = data.get("title", "")
        description = data.get("description", "")
        text = f"Title: {title}\nDescription: {description}"

        prompt = (
            "Analyze the following issue and return only a valid JSON object with two keys: "
            "'sentiment' and 'priority'.\n"
            "Sentiment must be exactly one of ['Happy', 'Sad', 'Angry'].\n"
            "Priority must be exactly one of ['High', 'Medium', 'Low'].\n"
            "No explanations, no extra text.\n\n"
            f"Issue:\n{text}"
        )

        payload = {
            "model": "sonar",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 50,
            "return_citations": False
        }

        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }

        try:
            resp = requests.post(ENDPOINT, headers=headers, json=payload, timeout=15)
            resp.raise_for_status()
            result = resp.json()
            content = result["choices"][0]["message"]["content"].strip()

            # For testing (remove this block when using real API)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"sentiment": "Happy", "priority": "Low"}), 500

        # --- CLEAN & PARSE ---
        content = content.strip()
        content = re.sub(r"^```(?:json)?", "", content)
        content = re.sub(r"```$", "", content)
        content = re.sub(r"^'''(?:json)?", "", content)
        content = re.sub(r"'''$", "", content)
        content = content.strip()

        match = re.search(r"\{[\s\S]*\}", content)
        if match:
            content = match.group(0).strip()

        try:
            parsed = json.loads(content)
            sentiment = parsed.get("sentiment", "Happy")
            priority = parsed.get("priority", "Low")
        except Exception as e:
            print("⚠️ JSON parse failed:", e)
            print("Problematic content:", repr(content))
            sentiment, priority = "Happy", "Low"

        # Validate model output strictly
        if sentiment not in ["Happy", "Sad", "Angry"]:
            sentiment = "Happy"
        if priority not in ["High", "Medium", "Low"]:
            priority = "Low"

        return jsonify({"sentiment": sentiment, "priority": priority})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"sentiment": "Happy", "priority": "Low"}), 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all()

        def bootstrap_user(email_key, password_key, role, name_key, worker_type=None):
            """Create configured development staff exactly once; never overwrite accounts."""
            email = (os.getenv(email_key) or "").strip().lower()
            password = os.getenv(password_key)
            if not email or not password or User.query.filter_by(email=email).first():
                return

            user = User(
                full_name=(os.getenv(name_key) or role.title()).strip(),
                email=email,
                password_hash=generate_password_hash(password),
                role=role,
            )
            db.session.add(user)
            db.session.flush()
            if role == "worker":
                db.session.add(WorkerInfo(
                    user_id=user.id,
                    worker_type=(worker_type or "General").strip(),
                ))

        # Useful for first local setup. In production, provision staff through admin tooling.
        bootstrap_user("ADMIN_EMAIL", "ADMIN_PASSWORD", "admin", "ADMIN_NAME")
        bootstrap_user(
            "BOOTSTRAP_WORKER_EMAIL",
            "BOOTSTRAP_WORKER_PASSWORD",
            "worker",
            "BOOTSTRAP_WORKER_NAME",
            os.getenv("BOOTSTRAP_WORKER_TYPE"),
        )
        db.session.commit()

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
