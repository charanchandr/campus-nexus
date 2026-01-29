// ---------------------------------------------------------
// AUTHENTICATION LOGIC (PHASE 1)
// ---------------------------------------------------------

async function handleRegister() {
    const fullname = document.getElementById('reg-name').value;
    const username = document.getElementById('reg-id').value;
    const email = document.getElementById('reg-email').value;
    const role = document.getElementById('reg-role').value;
    const password = document.getElementById('reg-pass').value;

    if (!fullname || !username || !email || !password) return showToast("Please fill all fields");

    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname, username, email, role, password })
    });

    const result = await response.json();
    if (response.ok) {
        showToast("Registration successful! Please login.");
        toggleAuth();
    } else {
        showToast(result.message);
    }
}

async function handleLogin() {
    const username = document.getElementById('login-id').value;
    const password = document.getElementById('login-pass').value;

    if (!username || !password) return showToast("Credentials required");

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    if (response.ok && result.status === 'mfa_required') {
        window.pendingUser = result.username;
        showMFA();
        showToast(`🔐 MFA Code: ${result.mfa_code_simulation} (Check this notification!)`, 8000);
    } else {
        showToast(result.message);
    }
}

async function handleMFA() {
    const code = document.getElementById('mfa-code').value;
    const response = await fetch('/api/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: window.pendingUser, mfa_code: code })
    });

    const result = await response.json();
    if (response.ok) {
        window.currentUser = result.user;
        enterDashboard();
    } else {
        showToast("Invalid verification code");
    }
}

// ---------------------------------------------------------
// PHASE 2: ITEM MANAGEMENT WITH ACM
// ---------------------------------------------------------

async function loadItems() {
    const response = await fetch('/api/items', {
        headers: { 'X-User-ID': window.currentUser.username }
    });

    if (!response.ok) {
        showToast("Failed to load items");
        return;
    }

    const data = await response.json();
    displayItems(data.items);
}

function displayItems(items) {
    const container = document.getElementById('items-container');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No items yet. Be the first to post!</p>';
        return;
    }

    container.innerHTML = items.map(item => {
        const isOwner = item.posted_by === window.currentUser.username;
        const statusBadge = item.status !== 'Active' ? `<span class="item-badge badge-claimed">${item.status}</span>` : '';
        const itemJSON = JSON.stringify(item).replace(/'/g, "\\'");

        return `
        <div class="item-card card" onclick='showItemDetails(${itemJSON})'>
            <div class="item-header">
                <div>
                    <span class="item-badge ${item.item_type === 'Lost' ? 'badge-lost' : 'badge-found'}">${item.item_type}</span>
                    ${statusBadge}
                </div>
                <span class="item-time">${item.timestamp}</span>
            </div>
            <h3 class="item-title">${item.item_name}</h3>
            <p class="item-location">📍 ${item.location}</p>
            <div class="item-footer">
                <span class="posted-by">By: ${item.posted_by_name}</span>
                <i class="fas fa-chevron-right" style="color: #ccc;"></i>
            </div>
        </div>
    `;
    }).join('');
}

function canDelete(item) {
    if (window.currentUser.role === 'Admin') return true;
    if (window.currentUser.role === 'Faculty' && item.posted_by === window.currentUser.username) return true;
    return false;
}

// ---------------------------------------------------------
// PHASE 4: SECURE MESSAGING (DIGITAL SIGNATURES)
// ---------------------------------------------------------

async function showItemDetails(item) {
    document.getElementById('details-item-name').innerText = item.item_name;
    const badge = document.getElementById('details-item-badge');
    badge.innerText = item.item_type;
    badge.className = `item-badge ${item.item_type === 'Lost' ? 'badge-lost' : 'badge-found'}`;

    document.getElementById('details-item-location').innerText = `📍 ${item.location}`;
    document.getElementById('details-item-time').innerText = `🕒 ${item.timestamp}`;
    document.getElementById('details-item-desc').innerText = item.description || "No description provided.";
    document.getElementById('details-posted-by').innerText = item.posted_by_name;

    const actionsContainer = document.getElementById('details-actions');
    actionsContainer.innerHTML = '';

    const isOwner = item.posted_by === window.currentUser.username;
    const isAdmin = window.currentUser.role === 'Admin';

    if (!isOwner) {
        actionsContainer.innerHTML += `
            <button class="btn-primary" style="flex: 1;" onclick="showClaimModal(${item.id}, '${item.item_name.replace(/'/g, "\\'")}')">
                <i class="fas fa-paper-plane"></i> Contact Poster
            </button>
        `;
    }

    if (isOwner || isAdmin) {
        if (item.status === 'Active') {
            actionsContainer.innerHTML += `
                <button class="btn-primary" style="flex: 1; background: var(--success); box-shadow: none;" onclick="markAsClaimed(${item.id})">
                    <i class="fas fa-check-circle"></i> Mark as Claimed
                </button>
            `;
        }
        actionsContainer.innerHTML += `
            <button class="btn-primary" style="flex: 1; background: var(--danger); box-shadow: none;" onclick="deleteItem(${item.id})">
                <i class="fas fa-trash"></i> Delete Post
            </button>
        `;
    }

    document.getElementById('details-modal').style.display = 'flex';
}

function closeDetailsModal() {
    document.getElementById('details-modal').style.display = 'none';
}

async function markAsClaimed(itemId) {
    const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'X-User-ID': window.currentUser.username
        },
        body: JSON.stringify({ status: 'Claimed' })
    });

    if (response.ok) {
        showToast("Item marked as Claimed!");
        closeDetailsModal();
        loadItems();
    } else {
        const result = await response.json();
        showToast(result.message);
    }
}

async function deleteItem(itemId) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': window.currentUser.username }
    });

    if (response.ok) {
        showToast("Item deleted successfully");
        closeDetailsModal();
        loadItems();
    } else {
        const result = await response.json();
        showToast(result.message);
    }
}

function showClaimModal(itemId, itemName) {
    closeDetailsModal();
    document.getElementById('claim-item-id').value = itemId;
    document.getElementById('claim-modal-title').innerText = `Claim: ${itemName}`;
    document.getElementById('claim-modal').style.display = 'flex';
}

async function submitClaim() {
    const itemId = document.getElementById('claim-item-id').value;
    const content = document.getElementById('claim-message').value;

    if (!content) return showToast("Please enter a message");

    const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-ID': window.currentUser.username
        },
        body: JSON.stringify({ item_id: itemId, content })
    });

    const result = await response.json();
    showToast(result.message);
    if (response.ok) {
        document.getElementById('claim-modal').style.display = 'none';
        document.getElementById('claim-message').value = '';
    }
}

function showReplyModal(senderId, itemId) {
    document.getElementById('reply-to-user').value = senderId;
    document.getElementById('reply-item-id').value = itemId;
    document.getElementById('reply-modal-title').innerText = `Reply to ${senderId}`;
    document.getElementById('reply-modal').style.display = 'flex';
}

async function submitReply() {
    const receiverId = document.getElementById('reply-to-user').value;
    const itemId = document.getElementById('reply-item-id').value;
    const content = document.getElementById('reply-message').value;

    if (!content) return showToast("Please enter a reply");

    const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-ID': window.currentUser.username
        },
        body: JSON.stringify({ item_id: itemId, content, receiver_id: receiverId })
    });

    const result = await response.json();
    showToast(result.message);
    if (response.ok) {
        document.getElementById('reply-modal').style.display = 'none';
        document.getElementById('reply-message').value = '';
        loadMessages(); // Refresh inbox
    }
}

async function loadMessages() {
    const response = await fetch('/api/messages', {
        headers: { 'X-User-ID': window.currentUser.username }
    });

    if (response.ok) {
        const data = await response.json();
        const container = document.getElementById('messages-container');
        if (data.messages.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No messages yet.</p>';
            return;
        }

        container.innerHTML = data.messages.map(m => `
            <div class="message-bubble" style="margin-bottom: 25px;">
                <div class="modal-header" style="margin-bottom: 15px;">
                    <strong style="font-size: 1.1rem; color: var(--primary-dark);">From: ${m.sender_id}</strong>
                    <span class="detail-label" style="margin: 0;">${m.timestamp}</span>
                </div>
                <div class="item-desc-box" style="background: var(--bg-main); margin-bottom: 15px; border-style: dashed;">
                    ${m.content}
                </div>
                <div style="padding-top: 15px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    ${m.is_authentic ?
                `<span class="auth-check"><i class="fas fa-check-circle"></i> Authentic Response</span>` :
                `<span class="auth-check" style="color: var(--danger);"><i class="fas fa-times-circle"></i> Verification Failed</span>`}
                    
                    <button class="btn-primary" style="padding: 10px 20px; width: auto; font-size: 0.9rem;" 
                            onclick="showReplyModal('${m.sender_id}', ${m.item_id})">Reply</button>
                </div>
            </div>
        `).join('');
    }
}

async function loadACM() {
    const response = await fetch('/api/acm', {
        headers: { 'X-User-ID': window.currentUser.username }
    });

    if (response.ok) {
        const data = await response.json();
        const container = document.getElementById('acm-display');

        let html = `
            <div style="margin-bottom: 20px;">
                <strong>Role:</strong> <span class="role-badge role-${data.role.toLowerCase()}">${data.role}</span>
            </div>
            <table class="acm-table">
                <thead>
                    <tr>
                        <th>Object</th>
                        <th>Permissions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const [obj, perms] of Object.entries(data.permissions)) {
            html += `
                <tr>
                    <td><strong>${obj}</strong></td>
                    <td>${perms.map(p => `<span class="perm-badge">${p}</span>`).join('')}</td>
                </tr>
            `;
        }

        html += `</tbody></table>`;
        container.innerHTML = html;
    }
}

// ---------------------------------------------------------
// UI TRANSITIONS
// ---------------------------------------------------------

function showSection(name) {
    const sections = ['dashboard-main', 'lost-items-section', 'messages-section', 'security-section'];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = 'none';
    });

    if (name === 'home') {
        document.getElementById('dashboard-main').style.display = 'grid';
    } else if (name === 'lost-items' || name === 'found-items') {
        document.getElementById('lost-items-section').style.display = 'block';
        loadItems();
    } else if (name === 'messages') {
        document.getElementById('messages-section').style.display = 'block';
        loadMessages();
    } else if (name === 'security') {
        document.getElementById('security-section').style.display = 'block';
        loadACM();
    }
}

function toggleAuth() {
    const isLogin = document.getElementById('login-form').style.display !== 'none';
    document.getElementById('login-form').style.display = isLogin ? 'none' : 'block';
    document.getElementById('register-form').style.display = isLogin ? 'block' : 'none';
}

function showMFA() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('mfa-form').style.display = 'block';
}

function enterDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('logout-link').style.display = 'block';

    document.getElementById('user-display-name').innerText = window.currentUser.fullname;
    document.getElementById('user-display-id').innerText = window.currentUser.username;

    const roleBadge = document.getElementById('user-role-badge');
    roleBadge.innerText = window.currentUser.role;
    roleBadge.className = 'role-badge role-' + window.currentUser.role.toLowerCase();
}

function showToast(msg, duration = 4000) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, duration);
}

function showPostModal() { document.getElementById('post-modal').style.display = 'flex'; }
function closePostModal() { document.getElementById('post-modal').style.display = 'none'; }
function logout() { window.location.reload(); }

function closeModal(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closePostModal();
        document.getElementById('claim-modal').style.display = 'none';
        document.getElementById('reply-modal').style.display = 'none';
        document.getElementById('details-modal').style.display = 'none';
    }
}

async function submitItem() {
    const item_name = document.getElementById('modal-item-name').value;
    const item_type = document.getElementById('modal-item-type').value;
    const location = document.getElementById('modal-item-location').value;
    const description = document.getElementById('modal-item-desc').value;

    if (!item_name || !location) return showToast("Please fill required fields");

    const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-ID': window.currentUser.username
        },
        body: JSON.stringify({ item_name, item_type, location, description })
    });

    if (response.ok) {
        showToast("Item posted securely!");
        closePostModal();
        loadItems();
    }
}

function togglePasswordVisibility(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}
