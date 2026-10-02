from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from model import db, Mess, MealMenu, MealRating
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
import datetime

mess_bp = Blueprint("mess", __name__, url_prefix="/api")
MEAL_TYPES = {"breakfast", "lunch", "snacks", "dinner"}


def meal_payload(meal):
    average, count = db.session.query(func.avg(MealRating.rating), func.count(MealRating.id)).filter(
        MealRating.meal_menu_id == meal.id
    ).one()
    return {
        "id": meal.id,
        "date": meal.service_date.isoformat(),
        "mealType": meal.meal_type,
        "menuText": meal.menu_text,
        "averageRating": round(float(average), 2) if average is not None else None,
        "ratingCount": int(count or 0),
    }


def parse_service_date(value):
    try:
        return datetime.date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def role_required(*roles):
    def wrapper(fn):
        def inner(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return fn(*args, **kwargs)
        inner.__name__ = fn.__name__
        return jwt_required()(inner)
    return wrapper


@mess_bp.get("/mess")
def get_mess_schedule():
    """Get the weekly mess schedule. This shared information is public."""
    mess_items = Mess.query.all()
    return jsonify([
        {
            "id": item.id,
            "day": item.day,
            "breakfast": item.breakfast,
            "lunch": item.lunch,
            "snacks": item.snacks,
            "dinner": item.dinner,
            "createdAt": item.created_at.isoformat(),
            "updatedAt": item.updated_at.isoformat(),
        }
        for item in mess_items
    ])


@mess_bp.get("/mess/daily")
def get_daily_meals():
    service_date = parse_service_date(request.args.get("date")) or datetime.date.today()
    meals = MealMenu.query.filter_by(service_date=service_date).order_by(MealMenu.meal_type).all()
    return jsonify([meal_payload(meal) for meal in meals])


@mess_bp.post("/mess/daily")
@role_required("admin")
def create_or_update_daily_meal():
    data = request.get_json() or {}
    service_date = parse_service_date(data.get("date"))
    meal_type = (data.get("mealType") or "").strip().lower()
    menu_text = (data.get("menuText") or "").strip()
    if not service_date or meal_type not in MEAL_TYPES or not menu_text:
        return jsonify({"error": "date, mealType, and menuText are required"}), 400

    meal = MealMenu.query.filter_by(service_date=service_date, meal_type=meal_type).first()
    if meal:
        meal.menu_text = menu_text
    else:
        meal = MealMenu(
            service_date=service_date,
            meal_type=meal_type,
            menu_text=menu_text,
            created_by=int(get_jwt_identity()),
        )
        db.session.add(meal)
    db.session.commit()
    return jsonify(meal_payload(meal)), 200


@mess_bp.post("/mess/daily/<int:meal_id>/ratings")
@role_required("student")
def rate_daily_meal(meal_id):
    data = request.get_json() or {}
    rating = data.get("rating")
    if not isinstance(rating, int) or isinstance(rating, bool) or not 1 <= rating <= 5:
        return jsonify({"error": "rating must be an integer from 1 to 5"}), 400

    meal = MealMenu.query.get(meal_id)
    if not meal:
        return jsonify({"error": "Meal not found"}), 404
    rating_record = MealRating(meal_menu_id=meal.id, user_id=int(get_jwt_identity()), rating=rating)
    try:
        db.session.add(rating_record)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "You have already rated this meal"}), 409
    return jsonify(meal_payload(meal)), 201


@mess_bp.get("/mess/ratings/history")
def meal_rating_history():
    try:
        days = min(max(int(request.args.get("days", 7)), 1), 30)
    except ValueError:
        return jsonify({"error": "days must be a number"}), 400
    start_date = datetime.date.today() - datetime.timedelta(days=days - 1)
    meals = MealMenu.query.filter(MealMenu.service_date >= start_date).order_by(
        MealMenu.service_date.desc(), MealMenu.meal_type
    ).all()
    return jsonify([meal_payload(meal) for meal in meals])


@mess_bp.post("/mess")
@role_required("admin")
def create_mess_item():
    data = request.get_json() or {}

    day = data.get("day")
    if not day:
        return jsonify({"error": "Day is required"}), 400

    try:
        existing = Mess.query.filter_by(day=day).first()

        if existing:
            if "breakfast" in data:
                existing.breakfast = data.get("breakfast", "")
            if "lunch" in data:
                existing.lunch = data.get("lunch", "")
            if "snacks" in data:
                existing.snacks = data.get("snacks", "")
            if "dinner" in data:
                existing.dinner = data.get("dinner", "")

            try:
                existing.updated_at = datetime.datetime.utcnow()
            except Exception:
                pass

            db.session.commit()

            return jsonify({
                "message": "Mess item updated",
                "id": existing.id,
                "day": existing.day,
                "breakfast": existing.breakfast,
                "lunch": existing.lunch,
                "snacks": existing.snacks,
                "dinner": existing.dinner,
                "createdAt": existing.created_at.isoformat(),
                "updatedAt": getattr(existing, "updated_at", existing.created_at).isoformat(),
            }), 200

        mess_item = Mess(
            day=day,
            breakfast=data.get("breakfast", ""),
            lunch=data.get("lunch", ""),
            snacks=data.get("snacks", ""),
            dinner=data.get("dinner", ""),
        )
        db.session.add(mess_item)
        db.session.commit()

        return jsonify({
            "message": "Mess item created",
            "id": mess_item.id,
            "day": mess_item.day,
            "breakfast": mess_item.breakfast,
            "lunch": mess_item.lunch,
            "snacks": mess_item.snacks,
            "dinner": mess_item.dinner,
            "createdAt": mess_item.created_at.isoformat(),
            "updatedAt": getattr(mess_item, "updated_at", mess_item.created_at).isoformat(),
        }), 201

    except Exception as e:
        db.session.rollback()
        print("create_mess_item error:", e)
        return jsonify({"error": str(e)}), 400



@mess_bp.put("/mess/<int:mess_id>")
@role_required("admin")
def update_mess_item(mess_id):
    """Update a mess schedule item - admin only"""
    mess_item = Mess.query.get(mess_id)
    
    if not mess_item:
        return jsonify({"error": "Mess item not found"}), 404
    
    data = request.get_json() or {}
    
    try:
        if "day" in data:
            existing = Mess.query.filter_by(day=data.get("day")).first()
            if existing and existing.id != mess_id:
                return jsonify({"error": "Day already exists in schedule"}), 409
            mess_item.day = data.get("day")
        
        if "breakfast" in data:
            mess_item.breakfast = data.get("breakfast", "")
        if "lunch" in data:
            mess_item.lunch = data.get("lunch", "")
        if "snacks" in data:
            mess_item.snacks = data.get("snacks", "")
        if "dinner" in data:
            mess_item.dinner = data.get("dinner", "")
        
        mess_item.updated_at = datetime.datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "id": mess_item.id,
            "day": mess_item.day,
            "breakfast": mess_item.breakfast,
            "lunch": mess_item.lunch,
            "snacks": mess_item.snacks,
            "dinner": mess_item.dinner,
            "createdAt": mess_item.created_at.isoformat(),
            "updatedAt": mess_item.updated_at.isoformat(),
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@mess_bp.delete("/mess/<int:mess_id>")
@role_required("admin")
def delete_mess_item(mess_id):
    """Delete a mess schedule item - admin only"""
    mess_item = Mess.query.get(mess_id)
    
    if not mess_item:
        return jsonify({"error": "Mess item not found"}), 404
    
    try:
        db.session.delete(mess_item)
        db.session.commit()
        return jsonify({"message": "Mess item deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400
