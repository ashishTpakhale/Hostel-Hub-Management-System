from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from model import db, Mess
import datetime

mess_bp = Blueprint("mess", __name__, url_prefix="/api")


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
