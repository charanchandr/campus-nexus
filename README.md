# Campus Nexus - Secure Lost & Found System

Campus Nexus is a decentralized, security-focused web application designed for university campuses to manage "Lost and Found" items securely. This project was developed with a heavy emphasis on Cybersecurity principles.

## 🚀 Features
- **Secure Authentication**: Two-step login with simulated Multi-Factor Authentication (MFA).
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Students, Faculty, and Admins.
- **Data Privacy**: Item locations are encrypted using AES-GCM before being stored.
- **Message Authenticity**: In-app messaging protected by ECDSA Digital Signatures.
- **Premium UI**: Modern, responsive interface inspired by Apple's design language.

## 🛡️ Security Implementation
- **Hashing**: Passwords stored using PBKDF2 with unique salt per user.
- **Encryption**: AES-GCM (128-bit) for sensitive location data.
- **Digital Signatures**: ECDSA (P-256) for verifying message sender identity.
- **Session Security**: Protected routes and restricted API endpoints.

## 💻 Tech Stack
- **Backend**: Python (Flask)
- **Database**: SQLite (via SQLAlchemy)
- **Frontend**: Vanilla HTML/CSS/JS
- **Cryptography**: PyCryptodome (for AES and ECDSA)

## 🛠️ Setup & Installation

### 1. Install Dependencies
Ensure you have Python installed, then run:
```powershell
pip install flask flask-sqlalchemy flask-cors pycryptodome
```

### 2. Configure the Application
The `app.py` uses a default secret key for development. For production, ensure `app.secret_key` and the salt in `MASTER_KEY` derivation are kept secure.

### 3. Run the Application
```powershell
python app.py
```
The application will be accessible at `http://127.0.0.1:5000`.

## 📂 Project Structure
- `app.py`: Main backend server, database models, and security utilities.
- `static/`: Frontend assets (CSS, JS, Images).
- `templates/`: HTML templates.
- `instance/`: Local SQLite database (excluded from Git).
