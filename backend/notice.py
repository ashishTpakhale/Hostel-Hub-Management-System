from flask import Blueprint, request, jsonify
from model import db, Notice
from issues import role_required 

notices_bp = Blueprint("notices", __name__, url_prefix="/api")


@notices_bp.get("/notices")
def get_notices():
    notices = Notice.query.order_by(Notice.created_at.desc()).all()
    return jsonify([
        {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "author": n.author,
            "createdAt": n.created_at.isoformat()
        } for n in notices
    ])


@notices_bp.post("/notices")
@role_required("admin")
def create_notice():
    data = request.get_json() or {}
    if not data.get("title") or not data.get("content"):
        return jsonify({"error": "Invalid input"}), 400
    notice = Notice(title=data["title"], content=data["content"], author=data.get("author", "Admin"))
    db.session.add(notice)
    db.session.commit()
    return jsonify({"message": "Notice created", "id": notice.id}), 201


@notices_bp.route("/notices/<int:notice_id>", methods=["PUT"])
@role_required("admin")
def update_notice(notice_id):
    data = request.get_json() or {}
    title = data.get("title")
    content = data.get("content")

    if not title or not content:
        return jsonify({"error": "Missing title or content"}), 400

    notice = Notice.query.get(notice_id)
    if not notice:
        return jsonify({"error": "Notice not found"}), 404

    notice.title = title
    notice.content = content
    db.session.commit()
    return jsonify({"message": "Notice updated successfully"}), 200


@notices_bp.delete("/notices/<int:notice_id>")
@role_required("admin")
def delete_notice(notice_id):
    notice = Notice.query.get(notice_id)
    if not notice:
        return jsonify({"error": "Notice not found"}), 404
    db.session.delete(notice)
    db.session.commit()
    return jsonify({"message": "Notice deleted"}), 200
