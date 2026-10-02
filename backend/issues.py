from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from model import db, Issue, User
import datetime
from functools import wraps

issues_bp = Blueprint("issues", __name__, url_prefix="/api")

def role_required(*roles):
    def wrapper(fn):
        @wraps(fn)
        def inner(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return fn(*args, **kwargs)
        inner.__name__ = fn.__name__
        return jwt_required()(inner)
    return wrapper

@issues_bp.get("/issues")
@jwt_required()
def get_issues():
    issues = Issue.query.filter(Issue.status != "Cancelled").order_by(Issue.created_at.desc()).all()
    return jsonify([
        {
            "id": i.id,
            "title": i.title,
            "description": i.description,
            "roomNumber": i.room_number,
            "status": i.status,
            "createdBy": i.created_by,
            "createdAt": i.created_at.isoformat(),
            "upvotes": i.upvotes,
            "voters": i.voters.split(",") if i.voters else [],
            "assignedTo": i.assigned_to,
            "assignedWorker": i.assignee.full_name if i.assignee else None,
            "assignedAt": i.assigned_at.isoformat() if i.assigned_at else None,
            "assignee": i.assigned_to,
            "assigneeName": i.assignee.full_name if i.assignee else None,
        }
        for i in issues
    ])


@issues_bp.post("/issues")
@role_required("student", "admin")
def create_issue():
    data = request.get_json() or {}

    if not all([data.get("title"), data.get("description"), data.get("roomNumber")]):
        return jsonify({"error": "Missing fields"}), 400

    creator = User.query.get(int(get_jwt_identity()))
    if not creator:
        return jsonify({"error": "User not found"}), 401
    issue = Issue(
        title=data["title"],
        description=data["description"],
        room_number=data["roomNumber"],
        created_by=creator.full_name,
    )
    db.session.add(issue)
    db.session.commit()
    return jsonify({"message": "Issue created", "id": issue.id}), 201
@issues_bp.route("/issues/<int:issue_id>", methods=["PUT"])
@jwt_required()
def update_issue(issue_id):
    data = request.get_json() or {}
    title = data.get("title")
    description = data.get("description")
    room_number = data.get("room_number") or data.get("roomNumber")
    if title is None or description is None or room_number is None:
        return jsonify({"error": "Missing title, description or room_number"}), 400

    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404

    claims = get_jwt()
    req_id = int(get_jwt_identity())  

    req_id = User.query.filter_by(id=req_id).first().full_name
    
    is_owner = False
    if isinstance(req_id, str):
        is_owner = req_id == issue.created_by
    else:
        is_owner = str(req_id) == str(issue.created_by)

    is_admin = claims.get("role") == "admin"

    if not (is_owner or is_admin):
        return jsonify({"error": "Forbidden"}), 403


    issue.title = title
    issue.description = description
    issue.room_number = room_number

    db.session.commit()

    return jsonify({"message": "Issue updated", "id": issue.id}), 200

@issues_bp.post("/issues/<int:issue_id>/status")
@role_required("worker")
def update_status(issue_id):
    data = request.get_json() or {}
    new_status = data.get("status")
    if new_status not in {"Pending", "In Progress", "Resolved"}:
        return jsonify({"error": "Invalid status"}), 400
    worker_id = int(get_jwt_identity())
    if not new_status:
        return jsonify({"error": "Missing status"}), 400
    issue = Issue.query.get_or_404(issue_id)
    if issue.assigned_to != worker_id:
        return jsonify({"error": "Issue is not assigned to you"}), 403
    issue.status = new_status
    db.session.commit()
    return jsonify({"message": "Status updated"})

@issues_bp.post("/issues/<int:issue_id>/upvote")
@role_required("student", "admin")
def toggle_upvote(issue_id):
    claims = get_jwt()
    email = claims.get("email")
    issue = Issue.query.get_or_404(issue_id)

    voters = set(filter(None, (issue.voters or "").split(",")))

    if email in voters:
        voters.remove(email)
        message = "Upvote removed"
    else:
        voters.add(email)
        message = "Upvoted successfully"

    issue.voters = ",".join(voters)
    issue.upvotes = len(voters)
    db.session.commit()

    return jsonify({
        "message": message,
        "upvotes": issue.upvotes,
        "voters": list(voters)
    })

@issues_bp.post("/issues/<int:issue_id>/assign")
@role_required("admin")
def assign_issue(issue_id):
    data = request.get_json() or {}
    assignee_id = data.get("worker_id")
    # print(assignee_id)
    if not assignee_id:
        return jsonify({"error": "Missing assignee_id"}), 400
    issue = Issue.query.get_or_404(issue_id)
    assignee = User.query.get(assignee_id)
    if not assignee or assignee.role != "worker":
        return jsonify({"error": "Selected assignee is not a worker"}), 400

    issue.assigned_to = assignee_id
    issue.assigned_at = datetime.datetime.utcnow()
    db.session.commit()

    return jsonify({
        "message": "Issue assigned successfully",
        "assigned_to": assignee.full_name,
        "assigned_at": issue.assigned_at.isoformat()
    }), 201

@issues_bp.get("/my-issues")
@role_required("worker")
def get_my_issues():
    claims = get_jwt()
    worker_email = claims.get("email")
    worker = User.query.filter_by(email=worker_email).first()
    if not worker:
        return jsonify([])

    issues = Issue.query.filter_by(assigned_to=worker.id).order_by(Issue.created_at.desc()).all()
    return jsonify([
        {
            "id": i.id,
            "title": i.title,
            "description": i.description,
            "roomNumber": i.room_number,
            "status": i.status,
            "createdBy": i.created_by,
            "createdAt": i.created_at.isoformat(),
            "upvotes": i.upvotes,
            "voters": i.voters.split(",") if i.voters else [],
            "assignedTo": i.assigned_to,
        } for i in issues
    ])

@issues_bp.post("/issues/<int:issue_id>/unassign")
@role_required("admin")
def unassign_issue(issue_id):
    issue = Issue.query.get_or_404(int(issue_id))
    issue.assigned_to = None
    issue.assigned_at = None
    db.session.commit()
    return jsonify({"message": "Worker unassigned successfully"}), 200

@issues_bp.delete("/issues/<int:issue_id>")
@jwt_required()
def delete_issue(issue_id):
    """
    Soft-delete an issue (mark as Cancelled) if requester is the creator or an admin.
    """
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404

    claims = get_jwt()
    requester = get_jwt_identity()

    try:
        req_user = None
        try:
            requester_id = int(requester)
            req_user = User.query.filter_by(id=requester_id).first()
        except Exception:
            req_user = User.query.filter_by(email=str(requester)).first() or User.query.filter_by(full_name=str(requester)).first()

        requester_name = req_user.full_name if req_user else str(requester)
    except Exception:
        requester_name = str(requester)

    is_owner = False
    if isinstance(requester_name, str):
        is_owner = requester_name == issue.created_by
    else:
        is_owner = str(requester_name) == str(issue.created_by)

    is_admin = claims.get("role") == "admin"

    if not (is_owner or is_admin):
        return jsonify({"error": "Forbidden"}), 403

    issue.status = "Cancelled"

    issue.assigned_to = None
    issue.assigned_at = None

    db.session.commit()

    return jsonify({"message": "Issue deleted (cancelled)", "id": issue.id}), 200
