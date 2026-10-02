from flask import request, jsonify
from model import db
from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt

bus_bp = Blueprint("bus_timetable", __name__)

class BusTimetable(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    route_name = db.Column(db.String(100), nullable=False)
    schedule = db.Column(db.Text, nullable=False)

@bus_bp.route('/api/timetable', methods=['GET'])
def get_timetable():
    timetables = BusTimetable.query.all()
    data = [{"id": t.id, "route_name": t.route_name, "schedule": t.schedule} for t in timetables]
    return jsonify(data)

@bus_bp.route('/api/timetable', methods=['POST'])
@jwt_required()
def update_timetable():
    if get_jwt().get("role") != "admin":
        return jsonify({"error": "Admins only"}), 403
    data = request.get_json()
    route = data.get("route_name")
    schedule = data.get("schedule")
    if not route or not schedule:
        return jsonify({"error": "route_name and schedule are required"}), 400

    existing = BusTimetable.query.filter_by(route_name=route).first()
    if existing:
        existing.schedule = schedule
    else:
        new_entry = BusTimetable(route_name=route, schedule=schedule)
        db.session.add(new_entry)

    db.session.commit()
    return jsonify({"message": "Timetable updated successfully!"})
