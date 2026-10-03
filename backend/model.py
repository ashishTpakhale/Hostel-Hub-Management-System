from flask_sqlalchemy import SQLAlchemy
import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="student")
    room_no = db.Column(db.String(20), nullable=True)  
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class WorkerInfo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    worker_type = db.Column(db.String(100), nullable=False)
    user = db.relationship("User", backref=db.backref("worker_info", uselist=False))

class Issue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    room_number = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='Pending')
    created_by = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    upvotes = db.Column(db.Integer, nullable=False, default=0)
    voters = db.Column(db.Text, nullable=True, default='')
    assigned_to = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    assigned_at = db.Column(db.DateTime, nullable=True)
    assignee = db.relationship("User", backref=db.backref("assigned_issues", lazy=True))


class IssueStatusHistory(db.Model):
    __tablename__ = "issue_status_history"
    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey("issue.id"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False)
    changed_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    changed_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    issue = db.relationship("Issue", backref=db.backref("status_history", lazy=True, cascade="all, delete-orphan"))
    actor = db.relationship("User")


class Notice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    author = db.Column(db.String(50), nullable=False, default='Admin')

class Mess(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    day = db.Column(db.String(20), nullable=False)  # Monday, Tuesday, etc.
    breakfast = db.Column(db.String(255), nullable=False, default='')
    lunch = db.Column(db.String(255), nullable=False, default='')
    snacks = db.Column(db.String(255), nullable=False, default='')
    dinner = db.Column(db.String(255), nullable=False, default='')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('day', name='unique_day'),)


class MealMenu(db.Model):
    """A dated meal that can be rated independently of the legacy weekly schedule."""
    __tablename__ = "meal_menu"

    id = db.Column(db.Integer, primary_key=True)
    service_date = db.Column(db.Date, nullable=False, index=True)
    meal_type = db.Column(db.String(20), nullable=False)
    menu_text = db.Column(db.Text, nullable=False, default="")
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("service_date", "meal_type", name="unique_meal_menu_per_service"),
    )


class MealRating(db.Model):
    __tablename__ = "meal_rating"

    id = db.Column(db.Integer, primary_key=True)
    meal_menu_id = db.Column(db.Integer, db.ForeignKey("meal_menu.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)

    meal = db.relationship("MealMenu", backref=db.backref("ratings", lazy=True, cascade="all, delete-orphan"))
    user = db.relationship("User", backref=db.backref("meal_ratings", lazy=True))

    __table_args__ = (
        db.UniqueConstraint("meal_menu_id", "user_id", name="unique_rating_per_student_meal"),
        db.CheckConstraint("rating >= 1 AND rating <= 5", name="meal_rating_between_one_and_five"),
    )


class Facility(db.Model):
    """A hostel facility with its currently published availability state."""
    __tablename__ = "facility"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    location = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Closed")
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    updater = db.relationship("User", backref=db.backref("facility_updates", lazy=True))

    __table_args__ = (
        db.CheckConstraint(
            "status IN ('Available', 'Occupied', 'Closed', 'Maintenance')",
            name="facility_status_is_supported",
        ),
    )


class NightCanteenMenu(db.Model):
    __tablename__ = "night_canteen_menu"

    id = db.Column(db.Integer, primary_key=True)
    service_date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="draft")
    contributor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    source_image_key = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    published_at = db.Column(db.DateTime, nullable=True)

    contributor = db.relationship("User", foreign_keys=[contributor_id])
    __table_args__ = (
        db.CheckConstraint("status IN ('draft', 'published')", name="night_canteen_menu_status"),
    )


class NightCanteenItem(db.Model):
    __tablename__ = "night_canteen_item"

    id = db.Column(db.Integer, primary_key=True)
    menu_id = db.Column(db.Integer, db.ForeignKey("night_canteen_menu.id"), nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    is_available = db.Column(db.Boolean, nullable=False, default=True)

    menu = db.relationship("NightCanteenMenu", backref=db.backref("items", lazy=True, cascade="all, delete-orphan"))
    __table_args__ = (db.CheckConstraint("price >= 0", name="night_canteen_item_price_nonnegative"),)


class Doctor(db.Model):
    __tablename__ = 'doctor'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    available_today = db.Column(db.Boolean, nullable=False, default=False)
    arrival_time = db.Column(db.String(10), nullable=True)  # store as HH:MM
    leave_time = db.Column(db.String(10), nullable=True)

class StudentMedical(db.Model):
    __tablename__ = 'student_medical'
    id = db.Column(db.Integer, primary_key=True)
    student_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    prescribed_medicine = db.Column(db.Text, nullable=True)
