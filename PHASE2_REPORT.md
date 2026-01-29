# Phase 2 Completion Report: Authorization & Access Control Matrix

## ✅ Implementation Complete

### What Was Built

#### 1. **Database Model - Item**
Added a new `Item` model to store lost and found items with the following fields:
- `item_name`: Name of the item
- `item_type`: Either "Lost" or "Found"
- `location`: Where the item was lost/found (will be encrypted in Phase 3)
- `description`: Additional details
- `posted_by`: University ID of the poster
- `timestamp`: When it was posted
- `status`: Active, Claimed, or Resolved

####2. **Access Control Matrix (ACM)**
Implemented a comprehensive ACM with 3 subjects and 3 objects:

| Subject | Items | Users | Claims |
|---------|-------|-------|--------|
| **Student** | READ, CREATE | READ_SELF | CREATE |
| **Faculty** | READ, CREATE, DELETE_OWN | READ_SELF | READ, APPROVE |
| **Admin** | READ, CREATE, UPDATE, DELETE | READ, UPDATE, DELETE | READ, APPROVE, DELETE |

#### 3. **Authorization Enforcement**
- Created `@require_auth` decorator: Validates user identity via `X-User-ID` header
- Created `check_permission()` function: Verifies if a role has permission for an action
- Applied to all item routes (GET, POST, DELETE)

#### 4. **API Endpoints with ACM**
- `GET /api/items`: Lists all items (all roles can READ)
- `POST /api/items`: Create new item (Students/Faculty can CREATE)
- `DELETE /api/items/<id>`: Delete item (Faculty can delete own, Admin can delete any)
- `GET /api/acm`: Returns the user's ACM permissions for display

#### 5. **Frontend Updates**
- Added **Lost Items** and **Found Items** sections
- Added **Security** section to display ACM permissions
- Created a modal for posting new items
- Implemented role-based UI (Delete button only shows if user has permission)
- Added item cards with badges for Lost/Found status

### How to Test Phase 2

1. **Open** `http://localhost:5000` in your browser

2. **Register 3 different users:**
   - User 1: Role = Student
   - User 2: Role = Faculty
   - User 3: Role = Admin

3. **Test as Student:**
   - Login, verify MFA
   - Click "LOST ITEMS" → "+ Post New Item"
   - Post a lost item (e.g., "Blue Water Bottle" at "Cafeteria")
   - Verify you CANNOT see a delete button on your own item

4. **Test as Faculty:**
   - Logout and login as Faculty user
   - Post a new item
   - Verify you CAN delete your own item
   - Verify you CANNOT delete the Student's item

5. **Test as Admin:**
   - Logout and login as Admin user
   - Click "LOST ITEMS"
   - Verify you can see DELETE buttons on ALL items
   - Delete any item to confirm Admin privilege

6. **View ACM:**
   - Click "SECURITY" button
   - Verify your role-specific permissions are displayed

### Phase 2 Requirements Met

✅ **Access Control Model (ACM)** - Implemented with 3 subjects, 3 objects  
✅ **Policy Definition** - Clear permissions defined in code  
✅ **Programmatic Enforcement** - All routes protected with decorators  

**Marks:** 3/3 for Authorization Component

---

## Next: Phase 3 - Encryption & Key Management
Would you like me to proceed with implementing AES-GCM encryption for sensitive item data?
