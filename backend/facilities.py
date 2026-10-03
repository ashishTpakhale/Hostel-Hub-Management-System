import datetime
from functools import wraps

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from model import Facility, db


facilities_bp = Blueprint("facilities", __name__, url_prefix="/api")
FACILITY_STATUSES = {"Available", "Occupied", "Closed", "Maintenance"}
INITIAL_FACILITIES = (
    ("Badminton court", "Hostel block"),
    ("Study room", "9th floor"),
    ("Table Tennis", "8th floor"),
    ("TV room", "6th floor"),
    ("Gym", "5th floor"),
    ("Legs/Cardio gym", "4th floor"),
    ("Girls' hostel facilities", "1st floor — managed separately"),
)


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def inner(*args, **kwargs):
        if get_jwt().get("role") != "admin":
            return jsonify({"error": "Admins only"}), 403
        return fn(*args, **kwargs)
    return inner


def facility_payload(facility):
    return {
        "id": facility.id,
        "name": facility.name,
        "location": facility.location,
        "status": facility.status,
        "updatedAt": facility.updated_at.isoformat(),
    }


def ensure_seeded():
    """Make the initial facilities available in existing local databases too."""
    if Facility.query.first():
        return
    db.session.add_all([
        Facility(name=name, location=location, status="Closed")
        for name, location in INITIAL_FACILITIES
    ])
    db.session.commit()


@facilities_bp.get("/facilities")
def get_facilities():
    ensure_seeded()
    facilities = Facility.query.order_by(Facility.id).all()
    return jsonify([facility_payload(facility) for facility in facilities])


@facilities_bp.put("/facilities/<int:facility_id>")
@admin_required
def update_facility_status(facility_id):
    facility = db.session.get(Facility, facility_id)
    if not facility:
        return jsonify({"error": "Facility not found"}), 404

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in FACILITY_STATUSES:
        return jsonify({"error": "status must be Available, Occupied, Closed, or Maintenance"}), 400

    facility.status = status
    facility.updated_by = int(get_jwt_identity())
    facility.updated_at = datetime.datetime.utcnow()
    db.session.commit()
    return jsonify(facility_payload(facility))
