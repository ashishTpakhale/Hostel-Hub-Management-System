from flask import Blueprint,jsonify,request
from flask_jwt_extended import get_jwt,get_jwt_identity,jwt_required
from model import Club,CommunityMessage,User,db
community_bp=Blueprint("community",__name__,url_prefix="/api/community")
@community_bp.get("/clubs")
def clubs():return jsonify([{"id":x.id,"name":x.name,"description":x.description,"lead":x.lead.full_name if x.lead else None} for x in Club.query.order_by(Club.name).all()])
@community_bp.post("/clubs")
@jwt_required()
def create_club():
 if get_jwt().get("role")!="admin":return jsonify({"error":"Admins only"}),403
 d=request.get_json(silent=True) or {};name=(d.get("name")or"").strip();desc=(d.get("description")or"").strip()
 if not name or not desc:return jsonify({"error":"Name and description required"}),400
 x=Club(name=name,description=desc,lead_id=d.get("leadId"));db.session.add(x);db.session.commit();return jsonify({"id":x.id}),201
@community_bp.get("/messages")
@jwt_required()
def get_messages():return jsonify([{"id":x.id,"body":x.body,"author":x.author.full_name,"createdAt":x.created_at.isoformat()} for x in CommunityMessage.query.filter_by(flagged=False).order_by(CommunityMessage.created_at.desc()).limit(100).all()[::-1]])
@community_bp.post("/messages")
@jwt_required()
def post_message():
 body=(request.get_json(silent=True)or{}).get("body","").strip();flagged=any(x in body.lower() for x in ("spam","abuse"))
 if not body or len(body)>1000:return jsonify({"error":"Message required (max 1000 chars)"}),400
 x=CommunityMessage(author_id=int(get_jwt_identity()),body=body,flagged=flagged);db.session.add(x);db.session.commit()
 if flagged:return jsonify({"error":"Message needs editing before it can be posted"}),422
 return jsonify({"id":x.id}),201
