import datetime
import json
import os
import uuid
from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from model import NightCanteenItem, NightCanteenMenu, User, db


night_canteen_bp = Blueprint("night_canteen", __name__, url_prefix="/api/night-canteen")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def manager_required(fn):
    @wraps(fn)
    @jwt_required()
    def inner(*args, **kwargs):
        if get_jwt().get("role") not in {"admin", "nc_manager"}:
            return jsonify({"error": "Night Canteen managers only"}), 403
        return fn(*args, **kwargs)
    return inner


def verified_college_user():
    claims = get_jwt()
    return claims.get("role") == "student" and claims.get("email", "").endswith("@iiitn.ac.in")


def parse_items(value):
    try:
        items = json.loads(value) if isinstance(value, str) else value
    except json.JSONDecodeError:
        return None
    if not isinstance(items, list) or not items:
        return None
    parsed = []
    for item in items:
        name = str(item.get("name", "")).strip() if isinstance(item, dict) else ""
        try:
            price = Decimal(str(item.get("price")))
        except (InvalidOperation, TypeError, ValueError):
            return None
        if not name or len(name) > 150 or price < 0:
            return None
        parsed.append({"name": name, "price": price, "is_available": bool(item.get("isAvailable", True))})
    return parsed


def save_image(image):
    if not image or not image.filename:
        return None, None
    if image.mimetype not in ALLOWED_IMAGE_TYPES:
        return None, "Only JPEG, PNG, and WebP images are accepted"
    image.stream.seek(0, os.SEEK_END)
    size = image.stream.tell()
    image.stream.seek(0)
    if size > MAX_IMAGE_BYTES:
        return None, "Image must be 5 MB or smaller"
    extension = os.path.splitext(secure_filename(image.filename))[1].lower() or ".img"
    storage_key = f"{uuid.uuid4().hex}{extension}"
    upload_dir = current_app.config["NIGHT_CANTEEN_UPLOAD_DIR"]
    os.makedirs(upload_dir, exist_ok=True)
    image.save(os.path.join(upload_dir, storage_key))
    return storage_key, None


def menu_payload(menu, include_draft=False):
    payload = {
        "id": menu.id, "date": menu.service_date.isoformat(), "status": menu.status,
        "contributor": menu.contributor.full_name if menu.contributor else "Verified student",
        "publishedAt": menu.published_at.isoformat() if menu.published_at else None,
        "items": [{"id": item.id, "name": item.name, "price": float(item.price), "isAvailable": item.is_available} for item in menu.items],
    }
    if include_draft:
        payload["sourceImageAttached"] = bool(menu.source_image_key)
    return payload


@night_canteen_bp.get("/menus")
def public_menus():
    date_value = request.args.get("date")
    try:
        service_date = datetime.date.fromisoformat(date_value) if date_value else datetime.date.today()
    except ValueError:
        return jsonify({"error": "date must be YYYY-MM-DD"}), 400
    menus = NightCanteenMenu.query.filter_by(service_date=service_date, status="published").order_by(NightCanteenMenu.id.desc()).all()
    return jsonify([menu_payload(menu) for menu in menus])


@night_canteen_bp.post("/contributions")
@jwt_required()
def create_draft():
    if not verified_college_user():
        return jsonify({"error": "A verified @iiitn.ac.in student account is required"}), 403
    try:
        service_date = datetime.date.fromisoformat(request.form.get("date", ""))
    except ValueError:
        return jsonify({"error": "date must be YYYY-MM-DD"}), 400
    items = parse_items(request.form.get("items"))
    if not items:
        return jsonify({"error": "Add at least one valid menu item and price"}), 400
    image_key, image_error = save_image(request.files.get("image"))
    if image_error:
        return jsonify({"error": image_error}), 400
    menu = NightCanteenMenu(service_date=service_date, contributor_id=int(get_jwt_identity()), source_image_key=image_key)
    db.session.add(menu)
    db.session.flush()
    db.session.add_all([NightCanteenItem(menu_id=menu.id, **item) for item in items])
    db.session.commit()
    return jsonify(menu_payload(menu, include_draft=True)), 201


@night_canteen_bp.get("/contributions/<int:menu_id>")
@jwt_required()
def get_draft(menu_id):
    menu = db.session.get(NightCanteenMenu, menu_id)
    if not menu:
        return jsonify({"error": "Menu not found"}), 404
    if menu.contributor_id != int(get_jwt_identity()) and get_jwt().get("role") not in {"admin", "nc_manager"}:
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(menu_payload(menu, include_draft=True))


@night_canteen_bp.put("/contributions/<int:menu_id>")
@jwt_required()
def edit_draft(menu_id):
    menu = db.session.get(NightCanteenMenu, menu_id)
    if not menu:
        return jsonify({"error": "Menu not found"}), 404
    is_manager = get_jwt().get("role") in {"admin", "nc_manager"}
    if menu.status != "draft" or (menu.contributor_id != int(get_jwt_identity()) and not is_manager):
        return jsonify({"error": "Only this draft's contributor or a manager may edit it"}), 403
    data = request.get_json(silent=True) or {}
    items = parse_items(data.get("items"))
    if not items:
        return jsonify({"error": "Add at least one valid menu item and price"}), 400
    NightCanteenItem.query.filter_by(menu_id=menu.id).delete()
    db.session.add_all([NightCanteenItem(menu_id=menu.id, **item) for item in items])
    db.session.commit()
    return jsonify(menu_payload(menu, include_draft=True))


@night_canteen_bp.post("/contributions/<int:menu_id>/publish")
@jwt_required()
def publish_draft(menu_id):
    menu = db.session.get(NightCanteenMenu, menu_id)
    if not menu:
        return jsonify({"error": "Menu not found"}), 404
    is_manager = get_jwt().get("role") in {"admin", "nc_manager"}
    if menu.status != "draft" or (menu.contributor_id != int(get_jwt_identity()) and not is_manager):
        return jsonify({"error": "Only this draft's contributor or a manager may publish it"}), 403
    menu.status, menu.published_at = "published", datetime.datetime.utcnow()
    db.session.commit()
    return jsonify(menu_payload(menu))


@night_canteen_bp.put("/items/<int:item_id>")
@manager_required
def update_item(item_id):
    item = db.session.get(NightCanteenItem, item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    data = request.get_json(silent=True) or {}
    if "isAvailable" in data:
        item.is_available = bool(data["isAvailable"])
    if "price" in data:
        try: item.price = Decimal(str(data["price"]))
        except (InvalidOperation, TypeError, ValueError): return jsonify({"error": "price must be valid"}), 400
        if item.price < 0: return jsonify({"error": "price cannot be negative"}), 400
    db.session.commit()
    return jsonify({"id": item.id, "name": item.name, "price": float(item.price), "isAvailable": item.is_available})


@night_canteen_bp.post("/managers/<int:user_id>")
@manager_required
def designate_manager(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user.role = "nc_manager"
    db.session.commit()
    return jsonify({"id": user.id, "role": user.role})
