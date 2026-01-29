# How to Identify User Roles in the System

## Visual Indicators (After Login)

### 1. **Role Badge in Welcome Banner**
After logging in, you'll see a colored badge next to your name:

- 🔵 **STUDENT** - Blue background (`#e3f2fd`)
- 🟠 **FACULTY** - Orange background (`#fff3e0`)
- 🔴 **ADMIN** - Pink background (`#fce4ec`)

Example:
```
Welcome! John Doe [STUDENT]
University ID: CB.SC.U4CSE23332
```

### 2. **Login Toast Notification**
When you log in, a notification appears showing:
```
Session started as Student: John Doe
```

### 3. **Security Page (ACM Display)**
Click the "SECURITY" button to see your exact permissions based on your role.

---

## Testing Different Roles

### To Test as Student:
1. Click "Register here"
2. Fill in your details
3. **Role dropdown**: Select "Student"
4. Complete registration and login
5. Look for the **BLUE badge** next to your name

### To Test as Faculty:
1. Register a new account
2. **Role dropdown**: Select "Faculty"
3. Login and look for the **ORANGE badge**
4. Try deleting your own posted item (you should be able to)

### To Test as Admin:
1. Register a new account
2. **Role dropdown**: Select "System Administrator"
3. Login and look for the **PINK badge**
4. Try deleting ANY item (you should be able to delete all)

---

## Behind the Scenes

### In the Code:
- **Registration**: You select role from `<select id="reg-role">`
- **After MFA**: Role is stored in `window.currentUser.role`
- **API Calls**: Role is fetched from database and checked against ACM

### In the Database:
Each user has a `role` field that stores one of:
- `"Student"`
- `"Faculty"`
- `"Admin"`

### Browser Console Check:
Open browser DevTools (F12) and type:
```javascript
console.log(window.currentUser.role);
```
This will show your current role.

---

## Permission Summary by Role

| Action | Student | Faculty | Admin |
|--------|---------|---------|-------|
| View Items | ✅ | ✅ | ✅ |
| Post Items | ✅ | ✅ | ✅ |
| Delete Own Items | ❌ | ✅ | ✅ |
| Delete Any Item | ❌ | ❌ | ✅ |
| View ACM | ✅ | ✅ | ✅ |

---

**Pro Tip**: To quickly test all roles, open the app in 3 different browsers (Chrome, Edge, Firefox) and register as a different role in each!
