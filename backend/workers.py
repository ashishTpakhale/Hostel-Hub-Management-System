from flask import Blueprint, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from model import db, User, WorkerInfo

workers_bp = Blueprint("workers", __name__, url_prefix="/api/workers")

@workers_bp.get("")
@jwt_required()
def get_workers():
    claims = get_jwt()
    if claims.get("role") not in ["admin","worker"]:
        return jsonify({"error": "Admins only"}), 403

    workers = (
        db.session.query(User, WorkerInfo)
        .outerjoin(WorkerInfo, WorkerInfo.user_id == User.id)
        .filter(User.role == "worker")
        .all()
    )

    data = [
        {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "worker_type": info.worker_type if info else "N/A",
        }
        for user, info in workers
    ]

    return jsonify(data), 200
