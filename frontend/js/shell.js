// shell.js — Retailer dashboard shell (shared across all retailer pages)

function clearAuth() {
  localStorage.removeItem('agriAuthToken');
}

function getAuthForShell() {
  try {
    return JSON.parse(localStorage.getItem('agriAuthToken'));
  } catch {
    return null;
  }
}

// Born-Localized Helper
function t(key, fallback) {
  const lang = localStorage.getItem('agriLang') || 'en';
  if (typeof window.translations !== 'undefined' && window.translations[lang] && window.translations[lang][key]) {
    return window.translations[lang][key];
  }
  return fallback;
}

function dashboardShell(activePage, title, subtitle, content, titleKey, subtitleKey, eyebrowKey) {
  const auth = getAuthForShell();
  const role = auth?.user?.role || 'retailer';
  const userName = auth?.user?.name || 'User';
  const initials = userName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  // Immediate translation for Born-Localized rendering
  const displayTitle = titleKey ? t(titleKey, title) : title;
  const displaySubtitle = subtitleKey ? t(subtitleKey, subtitle) : subtitle;
  const displayEyebrow = eyebrowKey ? t(eyebrowKey, eyebrowKey.replace('nav_', '').toUpperCase()) : 'DASHBOARD';

  let navLinks = "";
  
  if (role === 'admin') {
    navLinks = `
      <a class="nav-link" data-nav="admin-dashboard" href="../admin/dashboard.html">
        <span class="nav-icon">⊞</span> <span data-i18n="nav_dashboard">${t('nav_dashboard', 'Dashboard')}</span>
      </a>
      <a class="nav-link" data-nav="admin-users" href="../admin/users.html">
        <span class="nav-icon">👥</span> <span data-i18n="nav_team">${t('nav_team', 'Users')}</span>
      </a>
      <a class="nav-link" data-nav="admin-products" href="../admin/products.html">
        <span class="nav-icon">🚜</span> <span data-i18n="nav_inventory">${t('nav_inventory', 'Global Inventory')}</span>
      </a>
      <a class="nav-link" data-nav="admin-orders" href="../admin/orders.html">
        <span class="nav-icon">📦</span> <span data-i18n="nav_transactions">${t('nav_transactions', 'Transactions')}</span>
      </a>
    `;
  } else {
    // Retailer nav (default)
    navLinks = `
      <a class="nav-link" data-nav="dashboard" href="dashboard.html">
        <span class="nav-icon">⊞</span> <span data-i18n="nav_dashboard">${t('nav_dashboard', 'Dashboard')}</span>
      </a>
      <a class="nav-link" data-nav="marketplace" href="marketplace.html">
        <span class="nav-icon">🛒</span> <span data-i18n="nav_marketplace">${t('nav_marketplace', 'Marketplace')}</span>
      </a>
      <a class="nav-link" data-nav="cart" href="cart.html">
        <span class="nav-icon">🧺</span> <span data-i18n="nav_cart">${t('nav_cart', 'Cart')}</span> <span class="pill" id="cartCount">0</span>
      </a>
      <a class="nav-link" data-nav="checkout" href="checkout.html">
        <span class="nav-icon">✅</span> <span data-i18n="nav_checkout">${t('nav_checkout', 'Checkout')}</span>
      </a>
      <a class="nav-link" data-nav="orders" href="orders.html">
        <span class="nav-icon">📦</span> <span data-i18n="nav_orders">${t('nav_orders', 'Orders')}</span>
      </a>
    `;
  }

  // Common links
  navLinks += `
    <div class="nav-divider"></div>
    <a class="nav-link" data-nav="profile" href="profile.html">
      <span class="nav-icon">👤</span> <span data-i18n="nav_profile">${t('nav_profile', 'Profile')}</span>
    </a>
    <a class="nav-link" href="#" onclick="clearAuth(); window.location.href='../../index.html'">
      <span class="nav-icon">🚪</span> <span data-i18n="nav_logout">${t('nav_logout', 'Logout')}</span>
    </a>
  `;

  const brandLink = role === 'admin' ? '../admin/dashboard.html' : 'dashboard.html';

  return `
    <div class="app">
      <aside class="sidebar">
        <a class="brand" href="${brandLink}">
          <div class="brand-mark">AM</div>
          <div class="brand-text">
            <strong>AgriMart</strong>
            <span data-i18n="brand_tagline">${role === 'admin' ? 'Admin Control' : t('brand_tagline', 'Marketplace')}</span>
          </div>
        </a>
        <nav class="nav">
          ${navLinks}
        </nav>
      </aside>

      <main class="main">
        <header class="topbar">
          <div class="search">
            <input type="text" id="topSearch" placeholder="${t('lbl_search_retailer_ph', 'Search farmers, products, orders...')}" data-i18n-placeholder="lbl_search_retailer_ph">
            <span>🔍</span>
          </div>
          <div class="top-actions">
            <div class="lang-select">
              <select onchange="changeLanguage(this.value)" id="langPicker">
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="mr">MR</option>
                <option value="pa">PA</option>
              </select>
            </div>
            <button class="icon-btn" id="themeToggle" aria-label="Toggle dark mode" title="Toggle dark mode">🌙</button>
            <div class="notification-wrap">
              <button class="icon-btn" id="notificationBtn" aria-label="Notifications" onclick="window.toggleNotifMenu(event)">
                🔔<span class="badge" style="display:none;">0</span>
              </button>
              <div class="notification-menu" id="notificationMenu">
                <div style="padding:15px; text-align:center; color:var(--text-dim); font-size:12px;">Loading...</div>
              </div>
            </div>
            <a href="profile.html" class="profile-chip" style="text-decoration:none; color:inherit;">
              <div class="avatar">${initials}</div>
              <span class="profile-name">${userName.split(' ')[0].toLowerCase()}</span>
            </a>
          </div>
        </header>

        <section class="content">
          <div class="page-head">
            <div>
              <p class="eyebrow" ${eyebrowKey ? `data-i18n="${eyebrowKey}"` : ""}>${displayEyebrow}</p>
              <h1 ${titleKey ? `data-i18n="${titleKey}"` : ""}>${displayTitle}</h1>
              <p class="subtitle" ${subtitleKey ? `data-i18n="${subtitleKey}"` : ""}>${displaySubtitle}</p>
            </div>
          </div>
          ${content}
        </section>
      </main>
    </div>
    <div class="toast"></div>`;
}

// Global window functions for notifications
window.toggleNotifMenu = (e) => {
  if (e) e.stopPropagation();
  const menu = document.getElementById('notificationMenu');
  if (!menu) return;
  
  if (menu.style.display === 'block') {
    menu.style.display = 'none';
  } else {
    // Close others
    menu.style.display = 'block';
  }
};

window.onclick = () => {
  const menu = document.getElementById('notificationMenu');
  if (menu) menu.style.display = 'none';
};

window.markAsRead = async (id, link) => {
  const auth = JSON.parse(localStorage.getItem('agriAuthToken'));
  if (!auth) return;
  
  await fetch('http://localhost:5000/api/notifications/' + id + '/read', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + auth.token }
  });
  if (link && link !== '#') window.location.href = link;
  else if (window.fetchNotifs) window.fetchNotifs();
};

window.markAllRead = async () => {
  const auth = JSON.parse(localStorage.getItem('agriAuthToken'));
  if (!auth) return;
  
  await fetch('http://localhost:5000/api/notifications/mark-all-read', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + auth.token }
  });
  if (window.fetchNotifs) window.fetchNotifs();
};

// Initialize notifications for all dashboard pages
async function initShellNotifications() {
  const auth = JSON.parse(localStorage.getItem('agriAuthToken'));
  if (!auth) return;

  const menu = document.getElementById('notificationMenu');
  const badge = document.querySelector('.notification-wrap .badge');

  window.onclick = () => {
    const menu = document.getElementById('notificationMenu');
    if (menu) menu.classList.remove('open');
  };
  
  if (menu) menu.onclick = (e) => e.stopPropagation();

  window.fetchNotifs = async function() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const res = await fetch('http://localhost:5000/api/notifications', {
        headers: { 'Authorization': 'Bearer ' + auth.token },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      if (data.success && menu) {
        const unread = data.data.filter(n => !n.isRead).length;
        if (unread > 0 && badge) {
          badge.style.display = 'flex';
          badge.textContent = unread;
        } else if (badge) {
          badge.style.display = 'none';
        }

        if (data.data.length === 0) {
          menu.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-dim); font-size:12px;">No notifications</div>';
          return;
        }

        let html = `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; border-bottom:1px solid var(--line); background:var(--surface);">
            <strong style="font-size:13px; color:var(--text);">Notifications</strong>
            <button onclick="window.markAllRead()" style="background:none; border:none; color:var(--accent); font-size:11px; font-weight:600; cursor:pointer;">Mark all read</button>
          </div>
        `;
        
        html += data.data.map(n => `
          <div class="notification-item ${n.isRead ? 'read' : ''}" onclick="window.markAsRead('${n._id}', '${n.link}')" style="cursor:pointer; opacity: ${n.isRead ? 0.6 : 1}">
            <strong>${n.title}</strong>
            <span>${n.message}</span>
            <small style="font-size:10px; color:var(--text-dim); margin-top:4px; display:block;">${new Date(n.createdAt).toLocaleTimeString()}</small>
          </div>
        `).join('');
        menu.innerHTML = html;
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
      if (menu) {
        menu.innerHTML = `
          <div style="padding:20px; text-align:center;">
            <p style="color:var(--danger); font-size:12px; margin-bottom:10px;">Failed to load alerts</p>
            <button onclick="window.fetchNotifs()" style="padding:6px 12px; font-size:11px; border-radius:8px; border:1px solid var(--line); background:var(--surface);">Retry</button>
          </div>
        `;
      }
    }
  }

  window.fetchNotifs();
  setInterval(window.fetchNotifs, 30000); // Polling every 30s
}

// Run notification init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShellNotifications);
} else {
  initShellNotifications();
}
