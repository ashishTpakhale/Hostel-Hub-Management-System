from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from model import MarketplaceListing, NightCanteenMenu, db


profiles_bp = Blueprint("profiles", __name__, url_prefix="/api/profile")


@profiles_bp.get("/analytics")
@jwt_required()
def personal_analytics():
    user_id = int(get_jwt_identity())
    listed = db.session.query(func.count(MarketplaceListing.id)).filter_by(seller_id=user_id).scalar() or 0
    sold = db.session.query(func.count(MarketplaceListing.id)).filter_by(seller_id=user_id, status="sold").scalar() or 0
    given_away = db.session.query(func.count(MarketplaceListing.id)).filter_by(seller_id=user_id, status="given_away").scalar() or 0
    sales_total = db.session.query(func.coalesce(func.sum(MarketplaceListing.price), 0)).filter_by(seller_id=user_id, status="sold").scalar() or 0
    contributions = db.session.query(func.count(NightCanteenMenu.id)).filter_by(contributor_id=user_id).scalar() or 0
    recent = MarketplaceListing.query.filter_by(seller_id=user_id).filter(
        MarketplaceListing.status.in_(("sold", "given_away"))
    ).order_by(MarketplaceListing.created_at.desc()).limit(5).all()
    return jsonify({
        "marketplace": {"listed": int(listed), "sold": int(sold), "givenAway": int(given_away), "totalSales": float(sales_total)},
        "nightCanteenContributions": int(contributions),
        "recentTransactions": [{"id": x.id, "title": x.title, "status": x.status, "price": float(x.price)} for x in recent],
    })
