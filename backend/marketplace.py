from decimal import Decimal, InvalidOperation
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from model import MarketplaceListing, MarketplaceMessage, db

marketplace_bp = Blueprint("marketplace", __name__, url_prefix="/api/marketplace")
def listing_payload(x): return {"id":x.id,"title":x.title,"category":x.category,"description":x.description,"price":float(x.price),"condition":x.condition,"type":x.listing_type,"negotiable":x.negotiable,"status":x.status,"seller":x.seller.full_name,"sellerId":x.seller_id,"createdAt":x.created_at.isoformat()}
@marketplace_bp.get("/listings")
def listings():
 q=MarketplaceListing.query.filter_by(status="active")
 term=(request.args.get("q") or "").strip()
 if term: q=q.filter(MarketplaceListing.title.ilike(f"%{term}%"))
 category=request.args.get("category")
 if category: q=q.filter_by(category=category)
 return jsonify([listing_payload(x) for x in q.order_by(MarketplaceListing.created_at.desc()).all()])
@marketplace_bp.post("/listings")
@jwt_required()
def create_listing():
 d=request.get_json(silent=True) or {}
 try: price=Decimal(str(d.get("price")))
 except (InvalidOperation,TypeError,ValueError): return jsonify({"error":"Valid price required"}),400
 required=[d.get(k) for k in ("title","category","description","condition")]
 if not all(required) or price<0 or d.get("type","sale") not in {"sale","giveaway"}: return jsonify({"error":"Invalid listing"}),400
 x=MarketplaceListing(seller_id=int(get_jwt_identity()),title=d["title"].strip(),category=d["category"].strip(),description=d["description"].strip(),price=price,condition=d["condition"].strip(),listing_type=d.get("type","sale"),negotiable=bool(d.get("negotiable")))
 db.session.add(x);db.session.commit();return jsonify(listing_payload(x)),201
@marketplace_bp.post("/listings/<int:id>/messages")
@jwt_required()
def message(id):
 x=db.session.get(MarketplaceListing,id);uid=int(get_jwt_identity());d=request.get_json(silent=True) or {}
 if not x or x.status!="active": return jsonify({"error":"Listing unavailable"}),404
 if uid==x.seller_id:return jsonify({"error":"Seller cannot contact themselves"}),400
 body=(d.get("body") or "").strip()
 if not body or len(body)>1000:return jsonify({"error":"Message required (max 1000 chars)"}),400
 m=MarketplaceMessage(listing_id=id,sender_id=uid,body=body);db.session.add(m);db.session.commit();return jsonify({"id":m.id}),201
@marketplace_bp.get("/listings/<int:id>/messages")
@jwt_required()
def messages(id):
 x=db.session.get(MarketplaceListing,id);uid=int(get_jwt_identity())
 if not x:return jsonify({"error":"Listing not found"}),404
 q=MarketplaceMessage.query.filter_by(listing_id=id)
 if uid!=x.seller_id:q=q.filter((MarketplaceMessage.sender_id==uid))
 elif not any(m.sender_id==uid for m in q.all()): return jsonify([])
 return jsonify([{"id":m.id,"body":m.body,"sender":m.sender.full_name,"senderId":m.sender_id,"createdAt":m.created_at.isoformat()} for m in q.order_by(MarketplaceMessage.created_at).all()])
@marketplace_bp.put("/listings/<int:id>")
@jwt_required()
def complete(id):
 x=db.session.get(MarketplaceListing,id);d=request.get_json(silent=True) or {}
 if not x:return jsonify({"error":"Listing not found"}),404
 if x.seller_id!=int(get_jwt_identity()):return jsonify({"error":"Forbidden"}),403
 if d.get("status") not in {"active","sold","given_away"}:return jsonify({"error":"Invalid status"}),400
 x.status=d["status"];db.session.commit();return jsonify(listing_payload(x))
