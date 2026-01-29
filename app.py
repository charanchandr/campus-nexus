import os
import secrets
import base64
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Hash import SHA256
from Crypto.Cipher import AES
from Crypto.PublicKey import ECC
from Crypto.Signature import DSS

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///campus_nexus.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = "AMRITA_NEXUS_SECURE_SECRET_2026" # Set static for persistence

db = SQLAlchemy(app)
CORS(app)

# ---------------------------------------------------------
# DATABASE MODELS
# ---------------------------------------------------------

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False) # University ID
    email = db.Column(db.String(120), unique=True, nullable=False)   # Email address
    fullname = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False) # Student, Faculty, Admin
    password_hash = db.Column(db.String(256), nullable=False)
    salt = db.Column(db.String(64), nullable=False)
    mfa_secret = db.Column(db.String(32), nullable=True) # For simulation

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(120), nullable=False)
    item_type = db.Column(db.String(20), nullable=False)  # 'Lost' or 'Found'
    
    # PHASE 3: ENCRYPTED FIELDS
    encrypted_location = db.Column(db.Text, nullable=False)
    nonce = db.Column(db.String(64), nullable=False)  # IV for AES-GCM
    tag = db.Column(db.String(64), nullable=False)    # Auth tag for AES-GCM
    
    description = db.Column(db.Text, nullable=True)
    posted_by = db.Column(db.String(80), nullable=False)  # University ID
    posted_by_name = db.Column(db.String(120), nullable=False)
    timestamp = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='Active')  # Active, Claimed, Resolved

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    sender_id = db.Column(db.String(80), nullable=False)
    receiver_id = db.Column(db.String(80), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.String(50), nullable=False)
    
    # PHASE 4: DIGITAL SIGNATURE FIELDS
    signature = db.Column(db.Text, nullable=True) # ECDSA Signature
    public_key = db.Column(db.Text, nullable=True) # Sender's Public Key for verification

# ---------------------------------------------------------
# SECURITY UTILITIES (PHASE 4: DIGITAL SIGNATURES)
# ---------------------------------------------------------

def generate_key_pair():
    """Generate ECDSA Key Pair (P-256 Curve)"""
    key = ECC.generate(curve='P-256')
    return key.export_key(format='PEM'), key.public_key().export_key(format='PEM')

def sign_data(private_key_pem, message_text):
    """Sign a message using ECDSA"""
    key = ECC.import_key(private_key_pem)
    h = SHA256.new(message_text.encode('utf-8'))
    signer = DSS.new(key, 'fips-186-3')
    signature = signer.sign(h)
    return base64.b64encode(signature).decode('utf-8')

def verify_signature(public_key_pem, message_text, signature_b64):
    """Verify an ECDSA signature"""
    try:
        key = ECC.import_key(public_key_pem)
        h = SHA256.new(message_text.encode('utf-8'))
        verifier = DSS.new(key, 'fips-186-3')
        signature = base64.b64decode(signature_b64)
        verifier.verify(h, signature)
        return True
    except Exception as e:
        print(f"Signature Verification Error: {e}")
        return False

# ---------------------------------------------------------
# SECURITY UTILITIES (PHASE 3: ENCRYPTION)
# ---------------------------------------------------------

# Global Master Key derived from app secret
MASTER_KEY = PBKDF2(app.secret_key, "NEXUS_SALT_2026", 32, count=1000, hmac_hash_module=SHA256)

def encrypt_data(plaintext):
    """Encrypt using AES-GCM (Authenticated Encryption)"""
    cipher = AES.new(MASTER_KEY, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode('utf-8'))
    return {
        "ciphertext": base64.b64encode(ciphertext).decode('utf-8'),
        "nonce": base64.b64encode(cipher.nonce).decode('utf-8'),
        "tag": base64.b64encode(tag).decode('utf-8')
    }

def decrypt_data(enc_dict):
    """Decrypt using AES-GCM"""
    try:
        nonce = base64.b64decode(enc_dict['nonce'])
        ciphertext = base64.b64decode(enc_dict['ciphertext'])
        tag = base64.b64decode(enc_dict['tag'])
        
        cipher = AES.new(MASTER_KEY, AES.MODE_GCM, nonce=nonce)
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)
        return plaintext.decode('utf-8')
    except Exception as e:
        return "[DECRYPTION ERROR: Integrity Compromised]"

# ---------------------------------------------------------
# SECURITY UTILITIES (PHASE 1: HASHING)
# ---------------------------------------------------------

def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    key = PBKDF2(password, salt, 32, count=100000, hmac_hash_module=SHA256)
    return base64.b64encode(key).decode('utf-8'), salt

# ---------------------------------------------------------
# AUTHORIZATION: ACCESS CONTROL MATRIX (PHASE 2)
# ---------------------------------------------------------

ACM = {
    'Student': {
        'Items': ['READ', 'CREATE', 'DELETE_OWN', 'UPDATE_OWN'],
        'Users': ['READ_SELF'],
        'Messages': ['SEND', 'READ']
    },
    'Faculty': {
        'Items': ['READ', 'CREATE', 'DELETE_OWN'],
        'Users': ['READ_SELF'],
        'Messages': ['SEND', 'READ']
    },
    'Admin': {
        'Items': ['READ', 'CREATE', 'UPDATE', 'DELETE'],
        'Users': ['READ', 'UPDATE', 'DELETE'],
        'Messages': ['READ', 'DELETE']
    }
}

def check_permission(role, object_type, action):
    permissions = ACM.get(role, {}).get(object_type, [])
    return action in permissions

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        username = request.headers.get('X-User-ID')
        if not username:
            return jsonify({"message": "Authentication required"}), 401
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"message": "Invalid user"}), 401
        return f(user, *args, **kwargs)
    return decorated_function

# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"message": "User ID already exists"}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"message": "Email already exists"}), 400
    p_hash, salt = hash_password(data['password'])
    new_user = User(
        username=data['username'],
        email=data['email'],
        fullname=data['fullname'],
        role=data['role'],
        password_hash=p_hash,
        salt=salt,
        mfa_secret=secrets.token_hex(3).upper()
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully!"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({"message": "Invalid credentials"}), 401
    check_hash, _ = hash_password(data['password'], user.salt)
    if check_hash == user.password_hash:
        return jsonify({
            "status": "mfa_required",
            "username": user.username,
            "message": "Step 1/2 complete. Please enter MFA code.",
            "mfa_code_simulation": user.mfa_secret
        }), 200
    return jsonify({"message": "Invalid credentials"}), 401

@app.route('/api/verify-mfa', methods=['POST'])
def verify_mfa():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and user.mfa_secret == data['mfa_code']:
        return jsonify({
            "status": "success",
            "user": {
                "username": user.username,
                "fullname": user.fullname,
                "role": user.role
            }
        }), 200
    return jsonify({"message": "Invalid MFA code"}), 401

@app.route('/api/items', methods=['GET'])
@require_auth
def get_items(user):
    items = Item.query.all()
    items_list = []
    for item in items:
        decrypted_loc = decrypt_data({
            "ciphertext": item.encrypted_location,
            "nonce": item.nonce,
            "tag": item.tag
        })
        items_list.append({
            'id': item.id,
            'item_name': item.item_name,
            'item_type': item.item_type,
            'location': decrypted_loc,
            'description': item.description,
            'posted_by': item.posted_by,
            'posted_by_name': item.posted_by_name,
            'timestamp': item.timestamp,
            'status': item.status
        })
    return jsonify({"items": items_list}), 200

@app.route('/api/items', methods=['POST'])
@require_auth
def create_item(user):
    if not check_permission(user.role, 'Items', 'CREATE'):
        return jsonify({"message": "Access Denied"}), 403
    data = request.json
    encrypted = encrypt_data(data['location'])
    new_item = Item(
        item_name=data['item_name'],
        item_type=data['item_type'],
        encrypted_location=encrypted['ciphertext'],
        nonce=encrypted['nonce'],
        tag=encrypted['tag'],
        description=data.get('description', ''),
        posted_by=user.username,
        posted_by_name=user.fullname,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    db.session.add(new_item)
    db.session.commit()
    return jsonify({"message": "Item posted securely", "item_id": new_item.id}), 201

@app.route('/api/items/<int:item_id>', methods=['PATCH'])
@require_auth
def update_item_status(user, item_id):
    item = Item.query.get(item_id)
    if not item:
        return jsonify({"message": "Item not found"}), 404
    
    # Check permission (Admin or Owner with UPDATE_OWN)
    is_owner = item.posted_by == user.username
    if not (check_permission(user.role, 'Items', 'UPDATE') or (is_owner and check_permission(user.role, 'Items', 'UPDATE_OWN'))):
        return jsonify({"message": "Access Denied"}), 403
    
    data = request.json
    if 'status' in data:
        item.status = data['status']
        db.session.commit()
        return jsonify({"message": f"Item status updated to {item.status}"}), 200
    return jsonify({"message": "Nothing to update"}), 400

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
@require_auth
def delete_item(user, item_id):
    item = Item.query.get(item_id)
    if not item:
        return jsonify({"message": "Item not found"}), 404
        
    is_owner = item.posted_by == user.username
    
    # Check permission (Admin or Owner with DELETE_OWN)
    if not (check_permission(user.role, 'Items', 'DELETE') or (is_owner and (check_permission(user.role, 'Items', 'DELETE_OWN') or user.role == 'Faculty'))):
        return jsonify({"message": "Access Denied"}), 403
            
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item deleted"}), 200

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user:
        return jsonify({
            "status": "success",
            "message": "Recovery instructions sent!",
            "simulation_code": "RECOVER-" + secrets.token_hex(4).upper()
        }), 200
    return jsonify({"message": "Email not found"}), 404

@app.route('/api/messages', methods=['POST'])
@require_auth
def send_message(user):
    data = request.json
    item = Item.query.get(data['item_id'])
    if not item:
        return jsonify({"message": "Item not found"}), 404
    
    # Support directed messages (replies) or default to item owner
    receiver_id = data.get('receiver_id', item.posted_by)
    
    priv_pem, pub_pem = generate_key_pair()
    signature = sign_data(priv_pem, data['content'])
    
    new_msg = Message(
        item_id=data['item_id'],
        sender_id=user.username,
        receiver_id=receiver_id,
        content=data['content'],
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        signature=signature,
        public_key=pub_pem
    )
    db.session.add(new_msg)
    db.session.commit()
    return jsonify({"message": "Secure message sent with Digital Signature"}), 201

@app.route('/api/messages', methods=['GET'])
@require_auth
def get_messages(user):
    msgs = Message.query.filter((Message.receiver_id == user.username) | (Message.sender_id == user.username)).all()
    msg_list = []
    for m in msgs:
        is_authentic = verify_signature(m.public_key, m.content, m.signature)
        msg_list.append({
            'id': m.id,
            'item_id': m.item_id,
            'sender_id': m.sender_id,
            'receiver_id': m.receiver_id,
            'content': m.content,
            'timestamp': m.timestamp,
            'is_authentic': is_authentic
        })
    return jsonify({"messages": msg_list}), 200

@app.route('/api/acm', methods=['GET'])
@require_auth
def get_acm(user):
    return jsonify({
        "role": user.role,
        "permissions": ACM.get(user.role, {})
    }), 200

if __name__ == '__main__':
    with app.app_context():
        db_path = os.path.join(app.root_path, 'instance', 'campus_nexus.db')
        if not os.path.exists(db_path):
            db.create_all()
    app.run(debug=True, port=5000)
