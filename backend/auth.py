import re

from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from model import db, User, WorkerInfo

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def _claims(user):
    return {"role": user.role, "email": user.email, "name": user.full_name}


def _user_payload(user):
    return {
        "id": user.id,
        "name": user.full_name,
        "email": user.email,
        "role": user.role,
        "roomNo": user.room_no or "",
    }


def _auth_payload(user):
    return {
        "access": create_access_token(identity=str(user.id), additional_claims=_claims(user)),
        "refresh": create_refresh_token(identity=str(user.id), additional_claims=_claims(user)),
        "user": _user_payload(user),
    }


@auth_bp.post("/signup")
def signup():
    data = request.get_json() or {}
    name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    pwd = data.get("password") or ""
    role = (data.get("role") or "student").lower()
    roomNo = (data.get("roomNo") or "")
    if not name or not email or not pwd:
        return jsonify({"error": "Missing fields"}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "Enter a valid email address"}), 400
    if len(pwd) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409
    if role not in ("student",):
        return jsonify({"error": "Invalid role"}), 400
    user = User(full_name=name, email=email, password_hash=generate_password_hash(pwd), role=role,room_no=roomNo)
    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Email already registered"}), 409
    return jsonify({"message": "Account created", **_auth_payload(user)}), 201

@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    pwd = data.get("password") or ""
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, pwd):
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify(_auth_payload(user))

@auth_bp.post("/create-worker")
@jwt_required()
def create_worker():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admins only"}), 403

    data = request.get_json() or {}
    name = data.get("full_name")
    email = data.get("email")
    pwd = data.get("password")
    worker_type = data.get("worker_type", "General")

    if not name or not email or not pwd:
        return jsonify({"error": "Missing required fields"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409

    worker = User(
        full_name=name,
        email=email,
        password_hash=generate_password_hash(pwd),
        role="worker"
    )
    db.session.add(worker)
    db.session.flush() 
    info = WorkerInfo(
        user_id=worker.id,
        worker_type=worker_type,
    )
    db.session.add(info)
    db.session.commit()

    return jsonify({
        "message": "Worker account created successfully",
        "worker": {
            "id": worker.id,
            "name": worker.full_name,
            "email": worker.email,
            "role": worker.role,
            "worker_type": info.worker_type,
        }
    }), 201

@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    return jsonify(_user_payload(user))

@auth_bp.route("/update-profile", methods=["PUT"])
@jwt_required()
def update_profile():
    
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    if not data:
        return jsonify({"msg": "Missing JSON body"}), 400


    name = data.get("name") or data.get("full_name")
    email = data.get("email")
    room_no = data.get("roomNo") or data.get("room_no") or data.get("roomNo".lower())

    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    if name:
    
        if hasattr(user, "full_name"):
            user.full_name = name
        else:
            user.name = name

    if email:
        existing = User.query.filter(User.email == email, User.id != user_id).first()
        if existing:
            return jsonify({"msg": "Email already in use"}), 400
        user.email = email

    if room_no is not None:
        if hasattr(user, "room_no"):
            user.room_no = room_no
        else:
            setattr(user, "roomNo", room_no)

    db.session.commit()
    return jsonify({"msg": "Profile updated"}), 200
