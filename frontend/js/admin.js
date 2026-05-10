const API_BASE_URL = "http://localhost:5000/api";
const AUTH_STORAGE_KEY = "agriAuthToken";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
  } catch {
    return null;
  }
}

function getAuthHeaders() {
  const auth = getAuth();
  return auth?.token ? { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  return response;
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "toast fade-in";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────
async function initDashboard() {
  if (document.body.dataset.page !== "admin-dashboard") return;
  
  try {
    const [uRes, pRes, oRes] = await Promise.all([
      apiRequest("/users"),
      apiRequest("/products"),
      apiRequest("/orders/admin/all-orders")
    ]);

    const users = (await uRes.json()).data || [];
    const products = (await pRes.json()).data || [];
    const orders = (await oRes.json()).data || [];

    // Update Stats
    const stats = $$(".stat-card strong");
    if (stats[0]) stats[0].textContent = users.length;
    if (stats[1]) stats[1].textContent = products.length;
    if (stats[2]) stats[2].textContent = orders.length;
    if (stats[3]) {
      // Platform revenue is the sum of ALL orders placed
      const revenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      stats[3].textContent = "₹" + revenue.toLocaleString();
    }

    // Update labels via i18n
    const statLabels = $$(".stat-card p");
    if (statLabels[0]) statLabels[0].setAttribute("data-i18n", "lbl_total_users");
    if (statLabels[1]) statLabels[1].setAttribute("data-i18n", "lbl_active_products");
    if (statLabels[2]) statLabels[2].setAttribute("data-i18n", "lbl_total_orders");
    if (statLabels[3]) statLabels[3].setAttribute("data-i18n", "lbl_gross_revenue");

    // Render Recent Transactions (All statuses: Pending, Accepted, Shipped, Delivered, Cancelled)
    const transList = $("#recentTransactions");
    if (transList) {
      if (orders.length === 0) {
        transList.innerHTML = `<div class="empty-state" data-i18n="msg_no_transactions">No transactions yet.</div>`;
      } else {
        // Showing top 10 latest transactions of any status
        transList.innerHTML = orders.slice(0, 10).map(o => {
          let color = '#f47b20'; // Default Pending/Orange
          if (o.orderStatus === 'delivered') color = '#3a8f49'; // Green
          if (o.orderStatus === 'shipped') color = '#3b82f6';   // Blue
          if (o.orderStatus === 'accepted') color = '#8b5cf6';  // Purple
          if (o.orderStatus === 'cancelled') color = '#cf3f33'; // Red
          
          return `
            <div class="order-row">
              <div class="stat-icon" style="background:${color}15; color:${color};">📦</div>
              <div style="flex:1;">
                <strong>${o.product?.name || 'Item'}</strong>
                <p class="muted">
                  <span style="color:var(--text)">${o.farmer?.name || 'Farmer'}</span> 
                  ➔ 
                  <span style="color:var(--text)">${o.retailer?.name || 'Retailer'}</span>
                </p>
              </div>
              <div style="text-align:right;">
                <strong>₹${o.totalPrice}</strong>
                <p class="pill" style="font-size:10px; background:${color}15; color:${color}; border:none; padding:2px 8px; margin-top:4px; display:inline-block;">${o.orderStatus.toUpperCase()}</p>
              </div>
            </div>`;
        }).join("");
      }
    }

    // Render Recent Users
    const userList = $("#recentUsers");
    if (userList) {
      userList.innerHTML = users.slice(-5).reverse().map(u => `
        <div class="order-row">
          <div class="stat-icon" style="background:var(--accent-soft); color:var(--accent);">${u.name[0].toUpperCase()}</div>
          <div>
            <strong>${u.name}</strong>
            <p class="muted">${u.email} • <span style="text-transform:capitalize;">${u.role}</span></p>
          </div>
        </div>`).join("");
    }

    // Apply translations
    if (window.applyTranslations) window.applyTranslations();
  } catch (e) {
    console.error("Dashboard load failed", e);
  }
}

// ─── USER MANAGEMENT ──────────────────────────────────────────
async function initUsers() {
  if (document.body.dataset.page !== "admin-users") return;
  const list = $("#adminUsersList");
  if (!list) return;

  const res = await apiRequest("/users");
  const users = (await res.json()).data || [];

  list.innerHTML = users.map(u => {
    const isFarmer = u.role === 'farmer';
    const isRetailer = u.role === 'retailer';
    
    let details = '';
    if (isFarmer) {
      details = `
        <div style="font-size:11px; margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:8px; border-top:1px solid var(--line); padding-top:8px;">
          <span>🚜 <strong>Farm:</strong> ${u.farmName || 'N/A'}</span>
          <span>🌱 <strong>Crops:</strong> ${u.primaryCrops || 'N/A'}</span>
          <span>📞 <strong>Phone:</strong> ${u.phone || 'N/A'}</span>
          <span>📍 <strong>Address:</strong> ${u.address || 'N/A'}</span>
        </div>
      `;
    } else if (isRetailer) {
      details = `
        <div style="font-size:11px; margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:8px; border-top:1px solid var(--line); padding-top:8px;">
          <span>🏪 <strong>Market:</strong> ${u.marketArea || 'N/A'}</span>
          <span>📦 <strong>Category:</strong> ${u.preferredCategory || 'N/A'}</span>
          <span>📞 <strong>Phone:</strong> ${u.phone || 'N/A'}</span>
          <span>📍 <strong>Address:</strong> ${u.address || 'N/A'}</span>
        </div>
      `;
    } else {
      details = `<div style="font-size:11px; margin-top:8px; border-top:1px solid var(--line); padding-top:8px;">📞 <strong>Phone:</strong> ${u.phone || 'N/A'}</div>`;
    }

    return `
      <div class="user-detail-card" style="display:flex; flex-direction:column; align-items:stretch; padding:24px; gap:16px; margin-bottom:20px; background:var(--surface); border:1px solid var(--line); border-radius:16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <!-- Header: Avatar, Name, Role, Actions -->
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:15px;">
            <div class="profile-avatar" style="width:50px; height:50px; font-size:20px; background:var(--accent-soft); color:var(--accent);">${u.name[0].toUpperCase()}</div>
            <div>
              <h3 style="margin:0; font-size:18px;">${u.name}</h3>
              <p class="muted" style="margin:2px 0 0 0; font-size:13px;">${u.email}</p>
              <span class="pill" style="margin-top:5px; display:inline-block; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">${u.role}</span>
            </div>
          </div>
          <div class="actions" style="display:flex; gap:10px;">
            <button class="btn sm outline" data-i18n="btn_swap_role" onclick="changeRole('${u._id}', '${u.role}')" style="padding:6px 12px; font-size:12px;">
              ${(window.translations && window.translations[localStorage.getItem('agriLang') || 'en']) ? window.translations[localStorage.getItem('agriLang') || 'en']['btn_swap_role'] : 'Change Role'}
            </button>
            <button class="btn danger sm" data-i18n="btn_delete" onclick="deleteUser('${u._id}')" style="padding:6px 12px; font-size:12px;">
              ${(window.translations && window.translations[localStorage.getItem('agriLang') || 'en']) ? window.translations[localStorage.getItem('agriLang') || 'en']['btn_delete'] : 'Delete'}
            </button>
          </div>
        </div>

        <!-- Details Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; padding-top:15px; border-top:1px dashed var(--line);">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span class="muted" style="font-size:11px; text-transform:uppercase;" data-i18n="lbl_contact">Contact Number</span>
            <span style="font-size:14px; font-weight:500;">📞 ${u.phone || 'Not provided'}</span>
          </div>
          
          ${isFarmer ? `
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span class="muted" style="font-size:11px; text-transform:uppercase;" data-i18n="lbl_farm_name">Farm Name</span>
              <span style="font-size:14px; font-weight:500;">🚜 ${u.farmName || 'N/A'}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span class="muted" style="font-size:11px; text-transform:uppercase;" data-i18n="lbl_crops">Primary Crops</span>
              <span style="font-size:14px; font-weight:500;">🌱 ${u.primaryCrops || 'N/A'}</span>
            </div>
          ` : isRetailer ? `
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span class="muted" style="font-size:11px; text-transform:uppercase;" data-i18n="lbl_market_area">Market Area</span>
              <span style="font-size:14px; font-weight:500;">🏪 ${u.marketArea || 'N/A'}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span class="muted" style="font-size:11px; text-transform:uppercase;" data-i18n="lbl_category">Interested In</span>
              <span style="font-size:14px; font-weight:500;">📦 ${u.preferredCategory || 'All Categories'}</span>
            </div>
          ` : ''}

          <div style="display:flex; flex-direction:column; gap:4px; grid-column: 1 / -1;">
            <span class="muted" style="font-size:11px; text-transform:uppercase;" data-i18n="lbl_address">Registered Address</span>
            <span style="font-size:13px; line-height:1.4;">📍 ${u.address || 'No address on file'}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (window.applyTranslations) window.applyTranslations();
}

async function changeRole(id, currentRole) {
  const roles = ['farmer', 'retailer', 'admin'];
  
  // Create Modal if not exists
  let modal = $("#roleModal");
  if (!modal) {
    document.body.insertAdjacentHTML("beforeend", `
      <div id="roleModal" class="modal-overlay">
        <div class="modal-content" style="max-width:400px;">
          <h3 data-i18n="hdr_update_role">Update User Role</h3>
          <p class="muted" data-i18n="sub_update_role">Select a new system access level for this user.</p>
          <div class="role-options" id="roleOptions"></div>
          <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
            <button class="btn ghost" onclick="closeRoleModal()" data-i18n="btn_cancel">Cancel</button>
          </div>
        </div>
      </div>
    `);
    modal = $("#roleModal");
  }

  const optionsContainer = $("#roleOptions");
  optionsContainer.innerHTML = roles.map(role => {
    // Get translations directly if available for immediate rendering
    const lang = localStorage.getItem('agriLang') || 'en';
    const roleName = (window.translations && window.translations[lang]) ? window.translations[lang][`role_${role}`] : role;
    const roleDesc = (window.translations && window.translations[lang]) ? window.translations[lang][`desc_${role}`] : "";
    const currentText = (window.translations && window.translations[lang]) ? window.translations[lang]['lbl_current'] : "Current";

    return `
      <div class="role-option ${role === currentRole ? 'active' : ''}" onclick="confirmRoleChange('${id}', '${role}')">
        <div class="role-radio"></div>
        <div style="flex:1;">
          <strong data-i18n="role_${role}" style="text-transform:capitalize;">${roleName}</strong>
          <p class="muted" style="font-size:11px; margin:0;" data-i18n="desc_${role}">${roleDesc}</p>
        </div>
        ${role === currentRole ? `<span style="font-size:12px; color:var(--accent);" data-i18n="lbl_current">${currentText}</span>` : ''}
      </div>
    `;
  }).join("");

  modal.classList.add("open");
  if (window.applyTranslations) window.applyTranslations();
}

function getRoleDesc(role) {
  // Descriptions are now handled via i18n keys 'desc_admin', 'desc_farmer', 'desc_retailer'
  return "";
}

function closeRoleModal() {
  $("#roleModal")?.classList.remove("open");
}

async function confirmRoleChange(id, newRole) {
  closeRoleModal();
  const res = await apiRequest(`/users/${id}`, {
    method: "PUT",
    body: { role: newRole }
  });
  if (res.ok) {
    showToast(`Role updated to ${newRole}`);
    initUsers();
  }
}

async function deleteUser(id) {
  if (!confirm("Are you sure? This cannot be undone.")) return;
  const res = await apiRequest(`/users/${id}`, { method: "DELETE" });
  if (res.ok) {
    showToast("User deleted");
    initUsers();
  }
}

// ─── PRODUCT MANAGEMENT ───────────────────────────────────────
async function initProducts() {
  if (document.body.dataset.page !== "admin-products") return;
  const list = $("#adminProductsList");
  if (!list) return;

  const res = await apiRequest("/products");
  const products = (await res.json()).data || [];

  list.innerHTML = products.map(p => {
    let imgUrl = p.image || '';
    if (imgUrl && !imgUrl.startsWith('http')) {
      imgUrl = `http://localhost:5000/${imgUrl}`;
    }
    
    // Debug log to see what paths are being generated
    console.log(`Product: ${p.name}, Image: ${imgUrl}`);

    const hasImage = !!p.image;
    
    return `
      <div class="order-row">
        <div class="product-img-box" style="width:48px; height:48px; border-radius:10px; overflow:hidden; background:var(--surface-soft); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:20px;">
          ${hasImage ? `<img src="${imgUrl}" onerror="this.style.display='none'; this.parentElement.innerHTML='🛒';" style="width:100%; height:100%; object-fit:cover;">` : '🛒'}
        </div>
        <div style="flex:1; margin-left:14px;">
          <strong style="font-size:15px;">${p.name}</strong>
          <p class="muted" style="font-size:12px; margin-bottom:2px;">
            ${p.category || 'General'} • ₹${p.price}/${p.unit}
          </p>
          <p style="font-size:11px; color:var(--accent);">
            By: ${p.farmer?.name || 'Unknown Farmer'}
          </p>
        </div>
        <button class="btn danger sm" onclick="deleteProduct('${p._id}')" data-i18n="btn_delete">Delete</button>
      </div>
    `;
  }).join("");

  if (window.applyTranslations) window.applyTranslations();
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;
  const res = await apiRequest(`/products/${id}`, { method: "DELETE" });
  if (res.ok) {
    showToast("Product deleted");
    initProducts();
  }
}

// ─── ORDER MANAGEMENT ─────────────────────────────────────────
async function initOrders() {
  if (document.body.dataset.page !== "admin-orders") return;
  const list = $("#adminOrdersList");
  if (!list) return;

  const res = await apiRequest("/orders/admin/all-orders");
  const orders = (await res.json()).data || [];

  list.innerHTML = orders.map(o => `
    <div class="panel" style="margin-bottom:16px;">
      <div class="card-row">
        <div>
          <strong>${o.product?.name || 'Item'} x ${o.quantity}</strong>
          <p class="muted">Retailer: ${o.retailer?.name} • Farmer: ${o.farmer?.name}</p>
        </div>
        <span class="pill">${o.orderStatus}</span>
      </div>
      <div class="card-row" style="margin-top:12px; border-top:1px solid var(--line); padding-top:12px;">
        <span>Total: <strong>₹${o.totalPrice}</strong></span>
        <p class="muted" style="font-size:12px;">${new Date(o.createdAt).toLocaleString()}</p>
      </div>
    </div>
  `).join("");
  if (window.applyTranslations) window.applyTranslations();
}

async function loadNotifications() {
  const menu = $("#notificationMenu");
  const badge = $(".badge");
  if (!menu) return;

  try {
    const res = await apiRequest("/dashboard/admin/notifications");
    const notes = (await res.json()).data || [];
    
    // Get read IDs from localStorage
    const readIds = JSON.parse(localStorage.getItem("agriReadNotes") || "[]");
    const unreadCount = notes.filter(n => !readIds.includes(`${n.type}-${n.time}`)).length;

    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? "flex" : "none";
    }

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; border-bottom:1px solid var(--line); background:var(--surface);">
        <strong style="font-size:13px; color:var(--text);">Notifications</strong>
        <button onclick="markAllRead()" style="background:none; border:none; color:var(--accent); font-size:11px; font-weight:600; cursor:pointer; padding:4px 8px; border-radius:4px; transition:0.2s;" onmouseover="this.style.background='var(--accent-soft)'" onmouseout="this.style.background='none'">
          Mark all as read
        </button>
      </div>
    `;

    if (notes.length === 0) {
      html += `<div class="notification-item">No new activities.</div>`;
    } else {
      html += notes.map(n => {
        const id = `${n.type}-${n.time}`;
        const isRead = readIds.includes(id);
        return `
          <div class="notification-item ${isRead ? 'read' : ''}" onclick="toggleRead('${id}')" style="cursor:pointer; position:relative; opacity: ${isRead ? 0.6 : 1}">
            ${!isRead ? '<div style="position:absolute; right:15px; top:15px; width:8px; height:8px; background:var(--accent); border-radius:50%;"></div>' : ''}
            <strong>${n.title}</strong>
            <span>${n.message}</span>
            <small class="muted" style="display:block; font-size:10px; margin-top:4px;">
              ${new Date(n.time).toLocaleTimeString()}
            </small>
          </div>
        `;
      }).join("");
    }
    menu.innerHTML = html;
  } catch (e) {
    console.error("Failed to load notifications", e);
  }
}

window.toggleRead = (id) => {
  let readIds = JSON.parse(localStorage.getItem("agriReadNotes") || "[]");
  if (!readIds.includes(id)) {
    readIds.push(id);
    localStorage.setItem("agriReadNotes", JSON.stringify(readIds));
    loadNotifications();
  }
};

window.markAllRead = async () => {
  const res = await apiRequest("/dashboard/admin/notifications");
  const notes = (await res.json()).data || [];
  const allIds = notes.map(n => `${n.type}-${n.time}`);
  localStorage.setItem("agriReadNotes", JSON.stringify(allIds));
  loadNotifications();
};

async function loadAdminLogs() {
  const container = document.querySelector("aside.panel .empty-state") || document.querySelector("aside.panel");
  if (!container || document.body.dataset.page !== "admin-profile") return;

  try {
    const res = await apiRequest("/dashboard/admin/logs");
    const logs = (await res.json()).data || [];

    if (logs.length === 0) {
      container.innerHTML = `<p class="muted" style="text-align:center; padding:40px;">No activities recorded yet.</p>`;
    } else {
      container.innerHTML = `
        <div class="logs-list" style="display:flex; flex-direction:column; gap:12px; padding:10px;">
          ${logs.map(log => `
            <div class="log-item" style="padding:12px; border-radius:8px; background:var(--surface-soft); border-left:4px solid var(--accent);">
              <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:4px;">
                <strong style="font-size:13px; color:var(--accent);">${log.action}</strong>
                <small class="muted">${new Date(log.createdAt).toLocaleDateString()}</small>
              </div>
              <p style="font-size:13px; margin:0;">${log.details}</p>
              <small class="muted" style="font-size:11px;">Target: ${log.targetType} (${log.targetId})</small>
            </div>
          `).join("")}
        </div>
      `;
    }
  } catch (e) {
    console.error("Failed to load admin logs", e);
  }
}

async function initAdminProfile() {
  if (document.body.dataset.page !== "admin-profile") return;
  const auth = getAuth();
  const user = auth.user;

  $("#pName").value = user.name || "";
  $("#pEmail").value = user.email || "";
  $("#adminName").textContent = user.name;
  $("#adminAvatar").textContent = user.name.split(" ").map(n => n[0]).join("").toUpperCase();

  loadAdminLogs();

  $("#adminProfileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true;

    try {
      const res = await apiRequest("/users/profile", {
        method: "PUT",
        body: {
          name: $("#pName").value,
          email: $("#pEmail").value
        }
      });
      if (res.ok) {
        const payload = await res.json();
        // Update local auth
        auth.user = { ...auth.user, ...payload.data };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
        showToast("Profile updated successfully");
        setTimeout(() => location.reload(), 1000);
      }
    } catch (err) {
      showToast("Update failed");
    } finally {
      btn.disabled = false;
    }
  });
  if (window.applyTranslations) window.applyTranslations();
}

// ─── INITIALIZATION ───────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth();
  if (auth?.user?.role !== 'admin') {
    window.location.href = "../../login.html";
    return;
  }
  
  initDashboard();
  initUsers();
  initProducts();
  initOrders();
  initAdminProfile();
  loadNotifications();

  // Inject Modal CSS
  if (!document.getElementById("modalStyles")) {
    const style = document.createElement("style");
    style.id = "modalStyles";
    style.textContent = `
      .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:none; align-items:center; justify-content:center; z-index:1000; backdrop-filter:blur(4px); }
      .modal-overlay.open { display:flex; }
      .modal-content { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:24px; width:90%; position:relative; animation: modalIn 0.3s ease; }
      @keyframes modalIn { from { transform:scale(0.9); opacity:0; } to { transform:scale(1); opacity:1; } }
      .role-options { display:flex; flex-direction:column; gap:10px; margin-top:20px; }
      .role-option { display:flex; align-items:center; gap:15px; padding:12px; border:1px solid var(--line); border-radius:12px; cursor:pointer; transition:0.2s; }
      .role-option:hover { background:var(--surface-soft); border-color:var(--accent); }
      .role-option.active { border-color:var(--accent); background:var(--accent-soft); }
      .role-radio { width:18px; height:18px; border:2px solid var(--line); border-radius:50%; position:relative; }
      .role-option.active .role-radio { border-color:var(--accent); }
      .role-option.active .role-radio::after { content:""; position:absolute; top:3px; left:3px; width:8px; height:8px; background:var(--accent); border-radius:50%; }
    `;
    document.head.appendChild(style);
  }

  // Theme Toggle
  const themeBtn = $("#themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      localStorage.setItem("agriRetailTheme", isDark ? "dark" : "light");
      themeBtn.textContent = isDark ? "☀️" : "🌙";
    });
  }

  // Load Theme
  if (localStorage.getItem("agriRetailTheme") === "dark") {
    document.body.classList.add("dark");
    if (themeBtn) themeBtn.textContent = "☀️";
  }

  // Notification Toggle
  $("#notificationBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    $("#notificationMenu")?.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    $("#notificationMenu")?.classList.remove("open");
  });

  // Sidebar Logout
  $("#sidebarLogout")?.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = "../../login.html";
  });

  if (window.applyTranslations) window.applyTranslations();
});
