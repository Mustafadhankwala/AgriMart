// This App.js is used for Retailer fuctionality 

const API_BASE_URL = "http://localhost:5000/api";
const API_ORIGIN = API_BASE_URL.replace("/api", "");
const AUTH_STORAGE_KEY = "agriAuthToken";

const data = {
  farmers: [
    { name: "Ramesh Kumar", location: "Kolar", crops: "Tomato, Onion", rating: 4.8 },
    { name: "Meera Patil", location: "Mysuru", crops: "Spinach, Coriander", rating: 4.7 },
    { name: "Sairam Naidu", location: "Ratnagiri", crops: "Mango, Banana", rating: 4.9 },
    { name: "Anita Devi", location: "Shimla", crops: "Apple, Pear", rating: 4.6 }
  ],
  orders: [
    { id: "PO-1024", type: "purchase", item: "Fresh Tomatoes", status: "Delivered", amount: 3840, date: "06 May 2026" },
    { id: "SO-8811", type: "sale", item: "Mixed Vegetable Crates", status: "Packed", amount: 7400, date: "05 May 2026" },
    { id: "PO-1018", type: "purchase", item: "Alphonso Mangoes", status: "In Transit", amount: 5175, date: "04 May 2026" },
    { id: "SO-8798", type: "sale", item: "Retail Fruit Basket", status: "Delivered", amount: 6200, date: "03 May 2026" }
  ]
};

let products = [];
let farmers = [];
let retailerOrders = [];
let productPagination = { page: 1, pages: 1, total: 0 };
let productLoadError = "";

const money = value => `Rs. ${Number(value).toLocaleString("en-IN")}`;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

function saveAuth(token, user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
}

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
  } catch {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getAuthHeaders() {
  const auth = getAuth();
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
}

async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body && !isFormData && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
  });

  return response;
}

function resolveImageUrl(image) {
  if (!image) {
    return "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=700&q=80";
  }
  return image.startsWith("/uploads") ? `${API_ORIGIN}${image}` : image;
}

function normalizeProduct(product) {
  return {
    id: product._id,
    name: product.name,
    category: product.category,
    price: product.price,
    quantityValue: product.quantity,
    unit: product.unit || "kg",
    quantity: `${product.quantity} ${product.unit || "kg"}`,
    farmer: product.farmer?.name || "Unknown",
    image: resolveImageUrl(product.image),
    details: product.description || "",
  };
}

async function loadProducts(params = {}) {
  try {
    const query = new URLSearchParams({ limit: 50, ...params });
    Object.keys(params).forEach(key => {
      if (params[key] === "" || params[key] === "All" || params[key] == null) query.delete(key);
    });

    const response = await apiRequest(`/products?${query.toString()}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Unable to load products");
    }

    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : payload.data || [];
    products = items.map(normalizeProduct);
    productLoadError = "";
    if (payload.pagination) {
      productPagination = payload.pagination;
    }
  } catch (error) {
    console.error("Product fetch failed", error);
    productLoadError = error.message;
    products = [];
    productPagination = { page: 1, pages: 1, total: 0 };
  }
}

async function loadRetailerOrders() {
  try {
    const response = await apiRequest("/orders/my-orders");
    if (!response.ok) {
      throw new Error("Unable to load orders");
    }
    const payload = await response.json();
    retailerOrders = payload.data || [];
  } catch (error) {
    console.error("Orders fetch failed", error);
    retailerOrders = [];
  }
}


function getCart() {
  return store.get("agriRetailCart", []);
}

function saveCart(cart) {
  store.set("agriRetailCart", cart);
  updateCartBadge();
}

function cartFromApi(cartPayload) {
  return (cartPayload?.items || [])
    .filter(item => item.product)
    .map(item => ({ ...normalizeProduct(item.product), count: item.quantity }));
}

async function loadCart() {
  if (!getAuth()?.token) return;

  try {
    const response = await apiRequest("/cart");
    if (!response.ok) return;
    const payload = await response.json();
    saveCart(cartFromApi(payload.data));
  } catch (error) {
    console.error("Cart fetch failed", error);
  }
}

function getListedProducts() {
  return store.get("agriRetailListed", [
    { id: "listed-1", name: "Retail Potato Pack", price: 42, quantity: "30 kg", image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=80" }
  ]);
}

function saveListedProducts(items) {
  store.set("agriRetailListed", items);
}

function showToast(message) {
  let toast = $(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2300);
}

function updateCartBadge() {
  const badge = $("#cartCount");
  if (!badge) return;
  const count = getCart().reduce((sum, item) => sum + item.count, 0);
  badge.textContent = count;
}

async function addToCart(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;

  if (getAuth()?.token) {
    const response = await apiRequest("/cart/add", {
      method: "POST",
      body: { product: id, quantity: 1 },
    });

    if (response.ok) {
      const payload = await response.json();
      saveCart(cartFromApi(payload.data));
      showToast(`${product.name} added to cart. Cash payment only.`);
      return;
    }

    const payload = await response.json().catch(() => ({}));
    showToast(payload.message || "Unable to add item to cart.");
    return;
  }

  const cart = getCart();
  const existing = cart.find(item => item.id === id);
  if (existing) existing.count += 1;
  else cart.push({ ...product, count: 1 });
  saveCart(cart);
  showToast(`${product.name} added to cart. Cash payment only.`);
}

function setupShell() {
  const current = document.body.dataset.page;
  $$("[data-nav]").forEach(link => {
    if (link.dataset.nav === current) link.classList.add("active");
  });

  $(".hamburger")?.addEventListener("click", () => {
    $(".sidebar")?.classList.add("open");
    $(".overlay")?.classList.add("open");
  });

  $(".overlay")?.addEventListener("click", () => {
    $(".sidebar")?.classList.remove("open");
    $(".overlay")?.classList.remove("open");
  });

  $("#themeToggle")?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    store.set("agriRetailTheme", document.body.classList.contains("dark") ? "dark" : "light");
  });

  if (store.get("agriRetailTheme", "light") === "dark") {
    document.body.classList.add("dark");
  }

  $("#notificationBtn")?.addEventListener("click", () => {
    $("#notificationMenu")?.classList.toggle("open");
  });

  // Close notifications when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".notification-wrap")) {
      $("#notificationMenu")?.classList.remove("open");
    }
  });

  // Logout handler (shell.js adds the link; wire it here too as fallback)
  $("#sidebarLogout")?.addEventListener("click", (e) => {
    e.preventDefault();
    clearAuth();
    location.href = "../../login.html";
  });

  // Global Search logic
  const globalSearch = $("#globalSearch") || $("#topSearch");
  globalSearch?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const term = globalSearch.value.trim();
      if (!term) return;

      const onMarketplace = location.pathname.includes("marketplace.html");
      if (onMarketplace) {
        const localSearch = $("#productSearch");
        if (localSearch) {
          localSearch.value = term;
          localSearch.dispatchEvent(new Event("input"));
        }
      } else {
        location.href = `marketplace.html?search=${encodeURIComponent(term)}`;
      }
    }
  });

  updateCartBadge();
}

function productCard(product) {
  return `
    <article class="product-card fade-in">
      <a href="product-detail.html?id=${product.id}" aria-label="View ${product.name}">
        <img class="product-image" src="${product.image}" alt="${product.name}">
      </a>
      <div class="product-body">
        <div class="product-title-row">
          <h3>${product.name}</h3>
          <span class="pill">${product.category}</span>
        </div>
        <p class="muted">${product.farmer} - ${product.quantity}</p>
        <div class="card-row">
          <span class="price">${money(product.price)}/${product.unit}</span>
          <button class="btn primary" data-add-cart="${product.id}">Add</button>
        </div>
      </div>
    </article>`;
}

function renderMarketplace() {
  const grid = $("#productsGrid");
  if (!grid) return;
  let currentPage = 1;
  let searchTimer;

  const showLoading = () => {
    grid.innerHTML = `<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>`;
  };

  const render = async () => {
    const category = $("#categoryFilter")?.value || "All";
    const minPrice = $("#minPriceFilter")?.value || "";
    const maxPrice = $("#maxPriceFilter")?.value || "";
    const sort = $("#sortFilter")?.value || "newest";
    
    // Check URL for search param if it's the first render
    const urlParams = new URLSearchParams(location.search);
    const urlSearch = urlParams.get("search");
    if (urlSearch && !$("#productSearch").value) {
      $("#productSearch").value = urlSearch;
      // Clean URL so refresh doesn't keep the search term if cleared manually
      window.history.replaceState({}, document.title, location.pathname);
    }

    const query = ($("#productSearch")?.value || "").trim();

    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      grid.innerHTML = `<div class="empty-state">Minimum price cannot be greater than maximum price.</div>`;
      return;
    }

    showLoading();
    await loadProducts({ search: query, category, minPrice, maxPrice, sort, page: currentPage, limit: 9 });
    grid.innerHTML = productLoadError
      ? `<div class="empty-state">⚠️ ${productLoadError}</div>`
      : products.length
        ? products.map(productCard).join("")
        : `<div class="empty-state">No products match the selected filters.</div>`;
    if ($("#productPageInfo")) $("#productPageInfo").textContent = `Page ${productPagination.page} of ${productPagination.pages}`;
    if ($("#prevProducts")) $("#prevProducts").disabled = productPagination.page <= 1;
    if ($("#nextProducts")) $("#nextProducts").disabled = productPagination.page >= productPagination.pages;
    $$("[data-add-cart]").forEach(btn => btn.addEventListener("click", () => addToCart(btn.dataset.addCart)));
  };

  render();
  $("#categoryFilter")?.addEventListener("change", () => { currentPage = 1; render(); });
  $("#minPriceFilter")?.addEventListener("input", () => { currentPage = 1; clearTimeout(searchTimer); searchTimer = setTimeout(render, 300); });
  $("#maxPriceFilter")?.addEventListener("input", () => { currentPage = 1; clearTimeout(searchTimer); searchTimer = setTimeout(render, 300); });
  $("#sortFilter")?.addEventListener("change", () => { currentPage = 1; render(); });
  $("#productSearch")?.addEventListener("input", () => { currentPage = 1; clearTimeout(searchTimer); searchTimer = setTimeout(render, 250); });
  $("#prevProducts")?.addEventListener("click", () => { currentPage = Math.max(1, currentPage - 1); render(); });
  $("#nextProducts")?.addEventListener("click", () => { currentPage = Math.min(productPagination.pages, currentPage + 1); render(); });
}

function renderDashboard() {
  const recent = $("#recentOrders");
  if (recent) {
    const recentOrders = retailerOrders.slice(0, 4).map(order => ({
      id: order._id?.slice(-6).toUpperCase() || "ORDER",
      type: "purchase",
      item: order.product?.name || "Order item",
      status: order.orderStatus,
      date: new Date(order.createdAt).toLocaleDateString("en-IN"),
    }));

    if (!recentOrders.length) {
      recent.innerHTML = '<div class="empty-state" style="padding:20px;text-align:center;color:#888;">No recent orders yet.</div>';
      return;
    }

    recent.innerHTML = recentOrders.map(order => `
      <div class="order-row">
        <div class="stat-icon">${order.type === "sale" ? "RS" : "IN"}</div>
        <div>
          <strong>${order.item}</strong>
          <p class="muted">${order.id} - ${order.date}</p>
        </div>
        <span class="pill">${order.status}</span>
      </div>`).join("");
  }

  const statCards = $$(".stats-grid .stat-card strong");
  if (statCards.length >= 3) {
    // 1. Total Purchases (from retailerOrders)
    const totalPurchases = retailerOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
    statCards[0].textContent = money(totalPurchases);

    // 2. Active Farmers (Unique farmers in the marketplace)
    const uniqueFarmers = new Set(products.map(p => p.farmer).filter(Boolean));
    statCards[1].textContent = uniqueFarmers.size || 0;

    // 3. Recent Orders count
    statCards[2].textContent = retailerOrders.length;
  }

  const chartCanvas = $("#salesChart");
  if (chartCanvas && window.Chart) {
    new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          { label: "Purchases", data: [42, 55, 49, 64, 72, 81], borderColor: "#f47b20", backgroundColor: "rgba(244,123,32,.12)", tension: .42, fill: true },
          { label: "Sales", data: [34, 48, 62, 70, 86, 96], borderColor: "#3a8f49", backgroundColor: "rgba(58,143,73,.1)", tension: .42, fill: true }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
        scales: { y: { beginAtZero: true, grid: { color: "rgba(150,130,110,.16)" } }, x: { grid: { display: false } } }
      }
    });
  }
}

function renderCart() {
  const list = $("#cartList");
  const summary = $("#cartSummary");
  if (!list || !summary) return;
  const cart = getCart();
  if (!cart.length) {
    list.innerHTML = `<div class="empty-state">${t("lbl_empty_cart", "Your cart is empty. Add farm products from the marketplace.")}</div>`;
    summary.innerHTML = `<div class="summary-line total"><span>${t("lbl_total", "Total")}</span><span>${money(0)}</span></div>`;
    return;
  }

  list.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div>
        <strong>${item.name}</strong>
        <p class="muted">${item.farmer} - ${t("lbl_cash_only", "Cash only")}</p>
        <span class="price">${money(item.price)}/${item.unit || "kg"}</span>
      </div>
      <div class="qty-controls">
        <button data-dec="${item.id}">-</button>
        <strong>${item.count}</strong>
        <button data-inc="${item.id}">+</button>
        <button data-remove="${item.id}" class="btn danger">${t("lbl_remove", "Remove")}</button>
      </div>
    </div>`).join("");

  const totalWeight = cart.reduce((sum, item) => sum + item.count, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.count, 0);
  
  const minWeight = 15;
  const isBelowMin = totalWeight < minWeight;

  summary.innerHTML = `
    <div class="summary-line"><span>${t("lbl_items", "Items")}</span><span>${cart.length}</span></div>
    <div class="summary-line"><span>${t("lbl_total_weight", "Total Weight")}</span><span style="${isBelowMin ? 'color:#ef4444;font-weight:700;' : ''}">${totalWeight} kg</span></div>
    <div class="summary-line"><span>${t("lbl_subtotal", "Subtotal")}</span><span>${money(subtotal)}</span></div>
    <div class="summary-line"><span>${t("lbl_payment_method", "Payment")}</span><span>${t("lbl_cash_pickup", "Cash on pickup")}</span></div>
    <div class="summary-line total"><span>${t("lbl_total", "Total")}</span><span>${money(subtotal)}</span></div>
    ${isBelowMin ? `<div style="color:#ef4444;font-size:12px;margin-top:10px;padding:8px;background:#fee2e2;border-radius:6px;line-height:1.4;">⚠️ ${t("msg_min_order_limit", "Minimum total order must be 15kg to proceed.")}</div>` : ''}
  `;

  const checkoutBtn = $("a[href='checkout.html']");
  if (checkoutBtn) {
    if (isBelowMin) {
      checkoutBtn.style.opacity = "0.5";
      checkoutBtn.style.pointerEvents = "none";
      checkoutBtn.classList.add("disabled");
    } else {
      checkoutBtn.style.opacity = "1";
      checkoutBtn.style.pointerEvents = "auto";
      checkoutBtn.classList.remove("disabled");
    }
  }

  $$("[data-inc]").forEach(button => button.addEventListener("click", () => adjustCart(button.dataset.inc, 1)));
  $$("[data-dec]").forEach(button => button.addEventListener("click", () => adjustCart(button.dataset.dec, -1)));
  $$("[data-remove]").forEach(button => button.addEventListener("click", () => removeCart(button.dataset.remove)));
}

function removeCart(id) {
  adjustCart(id, -Infinity);
}

async function adjustCart(id, delta) {
  let cart = getCart();
  const idx = cart.findIndex(item => item.id === id);
  if (idx === -1) return;
  const newCount = cart[idx].count + delta;
  if (newCount <= 0) {
    // Remove item when count reaches zero
    cart = cart.filter(item => item.id !== id);
    saveCart(cart);
    if (getAuth()?.token) {
      await apiRequest(`/cart/remove/${id}`, { method: "DELETE" });
    }
    renderCart();
    showToast("Item removed from cart.");
    return;
  }
  cart[idx] = { ...cart[idx], count: newCount };
  saveCart(cart);
  if (getAuth()?.token) {
    const response = await apiRequest(`/cart/update/${id}`, {
      method: "PUT",
      body: { quantity: newCount },
    });
    if (response.ok) {
      const payload = await response.json();
      saveCart(cartFromApi(payload.data));
    }
  }
  renderCart();
}


async function placeCartOrders(cart, details = {}) {
  const auth = getAuth();
  if (!auth?.token) {
    showToast("Please login to place an order.");
    location.href = "../../login.html";
    return { success: false };
  }

  for (const item of cart) {
    const response = await apiRequest("/orders", {
      method: "POST",
      body: {
        product: item.id,
        quantity: item.count,
        ...details
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return {
        success: false,
        message: payload?.message || "Unable to place order.",
      };
    }
  }

  return { success: true };
}

async function renderCheckout() {
  const review = $("#checkoutReview");
  if (!review) return;
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.price * item.count, 0);
  
  // Pre-fill from auth/profile
  try {
    const res = await apiRequest("/users/profile");
    if (res.ok) {
      const payload = await res.json();
      const user = payload.data;
      
      const nameInp = $("#buyerName");
      const phoneInp = $("#phone");
      const addrInp = $("#deliveryAddress");
      
      if (nameInp && user.name) nameInp.value = user.name;
      if (phoneInp && user.phone) phoneInp.value = user.phone;
      if (addrInp && user.address) addrInp.value = user.address;
    }
  } catch (err) {
    console.error("Failed to fetch profile for checkout pre-fill", err);
    // Fallback to localStorage if API fails
    const auth = getAuth();
    if (auth?.user) {
      if ($("#buyerName")) $("#buyerName").value = auth.user.name || "";
      if ($("#phone")) $("#phone").value = auth.user.phone || "";
      if ($("#deliveryAddress")) $("#deliveryAddress").value = auth.user.address || "";
    }
  }

  review.innerHTML = cart.length ? cart.map(item => `
    <div class="summary-line"><span>${item.name} x ${item.count}</span><span>${money(item.price * item.count)}</span></div>
  `).join("") + `<div class="summary-line total"><span>${t("lbl_cash_total", "Cash Total")}</span><span>${money(total)}</span></div>` : `<div class="empty-state">${t("lbl_empty_cart", "Add products before checkout.")}</div>`;

  $("#checkoutForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const errors = validateFields(form);
    const totalWeight = cart.reduce((sum, item) => sum + item.count, 0);
    if (errors || !cart.length || totalWeight < 15) {
      if (totalWeight < 15 && cart.length > 0) {
        showToast("Minimum total order must be 15kg to place order.");
      } else {
        showToast(cart.length ? "Please complete the required checkout fields." : "Your cart is empty.");
      }
      return;
    }

    const details = {
      phone: $("#phone")?.value.trim() || "",
      deliveryAddress: $("#deliveryAddress")?.value.trim() || "",
    };

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      const response = await apiRequest("/orders", {
        method: "POST",
        body: { ...details, items: cart }
      });
      
      if (response.ok) {
        await apiRequest("/cart/clear", { method: "DELETE" });
        saveCart([]);
        showToast(t("msg_order_success", "Order placed successfully."), "green");
        setTimeout(() => location.href = "orders.html", 1500);
      } else {
        const errData = await response.json().catch(() => ({}));
        showToast(errData.message || "Failed to place order.", "red");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred while placing order.", "red");
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

function validateFields(form) {
  let hasError = false;
  form.querySelectorAll("[required]").forEach(input => {
    const fieldEl = input.closest(".field");
    const error = fieldEl ? fieldEl.querySelector(".error") : null;
    const isEmpty = input.tagName === "SELECT"
      ? !input.value || input.value === ""
      : !input.value.trim();
    if (isEmpty) {
      hasError = true;
      if (error) error.textContent = "Required";
      input.style.borderColor = "#ef4444";
    } else {
      if (error) error.textContent = "";
      input.style.borderColor = "";
    }
  });
  return hasError;
}

async function loadFarmers() {
  try {
    const res = await apiRequest("/users/farmers");
    if (res.ok) {
      const payload = await res.json();
      farmers = payload.data;
    }
  } catch (e) {
    console.error("Failed to load farmers", e);
  }
}

function renderFarmers() {
  const grid = $("#farmersGrid");
  if (!grid) return;
  
  const displayFarmers = farmers.length > 0 ? farmers : data.farmers;

  grid.innerHTML = displayFarmers.map(farmer => {
    const initials = farmer.name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
    const cropList = farmer.primaryCrops || farmer.crops || "Various farm products";
    const loc = farmer.location || "Verified Farmer";
    const phone = farmer.phone || "No phone provided";

    return `
    <article class="farmer-card">
      <div class="farmer-top">
        <div class="farmer-avatar">${initials}</div>
        <div>
          <h3>${farmer.name}</h3>
          <p class="muted">${loc} • <strong>${phone}</strong></p>
        </div>
      </div>
      <p class="muted" style="margin: 10px 0;">
        <i class="fas fa-seedling"></i> ${cropList}
      </p>
    </article>`;
  }).join("");
}

async function renderProfile() {
  const profilePage = document.body.dataset.page === 'profile';
  if (!profilePage) return;
  
  let user = getAuth()?.user;
  try {
    const res = await apiRequest("/users/profile");
    if (res.ok) {
      const payload = await res.json();
      user = payload.data;
    }
  } catch (e) {
    console.warn("Profile fetch failed", e);
  }

  if (!user) return;
  const { name, email } = user;
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  const avatarEl = document.getElementById('profileAvatar');
  const displayEl = document.getElementById('profileDisplayName');
  const nameInput = document.getElementById('profileName');
  const emailInput = document.getElementById('profileEmail');
  const phoneInput = document.getElementById('profilePhone');
  const marketInput = document.getElementById('profileMarket');
  const addressInput = document.getElementById('profileAddress');
  const categorySelect = document.getElementById('profileCategory');

  if (avatarEl) avatarEl.textContent = initials;
  if (displayEl) displayEl.textContent = name;
  if (nameInput) nameInput.value = name;
  if (emailInput) emailInput.value = email || '';
  if (phoneInput) phoneInput.value = user.phone || '';
  if (marketInput) marketInput.value = user.marketArea || user.location || '';
  if (addressInput) addressInput.value = user.address || '';
  if (categorySelect) categorySelect.value = user.preferredCategory || 'Fruits & Vegetables';

  const form = document.getElementById('profileForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: document.getElementById('profilePhone')?.value.trim() || '',
      location: document.getElementById('profileMarket')?.value.trim() || '',
      marketArea: document.getElementById('profileMarket')?.value.trim() || '',
      preferredCategory: document.getElementById('profileCategory')?.value || '',
      address: document.getElementById('profileAddress')?.value.trim() || ''
    };

    try {
      const res = await apiRequest("/users/profile", {
        method: "PUT",
        body: data
      });
      if (res.ok) {
        showToast('Profile updated successfully in database.');
        // Update local auth if name/email changed
        const auth = getAuth();
        auth.user = { ...auth.user, ...data };
        localStorage.setItem("agriAuthToken", JSON.stringify(auth));
      }
    } catch (err) {
      showToast('Update failed: ' + err.message);
    }
  });
}

const ORDER_STATUS_BADGE = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

function renderOrders() {
  const list = $("#ordersList");
  if (!list) return;
  let activeTab = "all";

  const render = () => {
    const filtered = activeTab === "all"
      ? retailerOrders
      : retailerOrders.filter(o => {
          if (activeTab === "active") return ["pending", "accepted", "shipped"].includes(o.orderStatus);
          if (activeTab === "completed") return o.orderStatus === "delivered";
          if (activeTab === "cancelled") return o.orderStatus === "cancelled";
          return true;
        });

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state">${t("lbl_no_orders", "No orders found for this filter.")}</div>`;
      return;
    }

    list.innerHTML = filtered.map(order => {
      const color = ORDER_STATUS_BADGE[order.orderStatus] || "#64748b";
      const statusLabel = t['sub_' + order.orderStatus] || order.orderStatus;
      return `
      <article class="order-card">
        <div class="card-row">
          <div>
            <h3>${order.product?.name || "Order item"}</h3>
            <p class="muted">${t("lbl_from", "From")}: ${order.farmer?.name || "Farmer"} &bull; ${new Date(order.createdAt).toLocaleDateString(currentLang === 'en' ? 'en-IN' : currentLang)}</p>
          </div>
          <span class="pill" style="background:${color}20;color:${color};">${statusLabel}</span>
        </div>
        <div class="card-row">
          <span class="muted">${t("lbl_qty", "Qty")}: ${order.quantity} ${order.product?.unit || "kg"}</span>
          <strong class="price">${money(order.totalPrice)}</strong>
        </div>
      </article>`;
    }).join("");
  };

  render();
  $$(".tab").forEach(tab => tab.addEventListener("click", () => {
    $$(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeTab = tab.dataset.type || "all";
    render();
  }));
}

async function renderProductDetail() {
  const wrap = $("#productDetail");
  if (!wrap) return;
  const productId = new URLSearchParams(location.search).get("id");
  if (!productId) {
    wrap.innerHTML = `<div class="empty-state">No product selected.</div>`;
    return;
  }

  wrap.innerHTML = `<div class="empty-state">Loading product...</div>`;

  // First check the already-loaded products array
  let product = products.find(item => item.id === productId);

  // If not found, fetch directly from API
  if (!product) {
    try {
      const response = await apiRequest(`/products?limit=1`);
      // Fetch the specific product via search workaround since no single-product endpoint
      const res = await apiRequest(`/products/${productId}`);
      if (res.ok) {
        const payload = await res.json();
        if (payload.data) product = normalizeProduct(payload.data);
      }
    } catch (e) {
      console.error("Product detail fetch failed", e);
    }
  }

  if (!product) {
    wrap.innerHTML = `<div class="empty-state">Product not found.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="panel hero-panel">
      <div>
        <p class="eyebrow">${product.category}</p>
        <h1>${product.name}</h1>
        <p>${product.details || "No description available."}</p>
        <p class="muted">Sold by: ${product.farmer} &bull; Available: ${product.quantity}</p>
        <div class="card-row">
          <span class="price">${money(product.price)}/${product.unit}</span>
          <button class="btn primary" id="detailAddCart">Add to Cart</button>
        </div>
      </div>
      <img class="product-image" src="${product.image}" alt="${product.name}" style="border-radius:18px;" onerror="this.src='https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=700&q=80'">
    </div>`;
  $("#detailAddCart")?.addEventListener("click", () => addToCart(product.id));
}

async function init() {
  // ── Auth guard ───────────────────────────────────────────
  const auth = getAuth();
  if (!auth?.token) {
    location.href = "../../login.html";
    return;
  }
  if (auth.user?.role !== "retailer") {
    // Farmer or admin landed here – send to their dashboard
    location.href = auth.user?.role === "farmer"
      ? "../farmer.html/farmerindex.html"
      : "../../login.html";
    return;
  }

  setupShell();
  await loadCart();
  await loadFarmers();
  await loadProducts(); // Load products first for farmer count
  await loadRetailerOrders();
  renderDashboard();
  renderMarketplace();
  renderCart();
  await renderCheckout();
  renderFarmers();
  renderOrders();
  await renderProductDetail();
  await renderProfile();

  // ── Language listener ────────────────────────────────────
  document.addEventListener('languageChanged', async () => {
    renderDashboard();
    renderMarketplace();
    renderCart();
    await renderCheckout();
    renderOrders();
    renderFarmers();
    renderProductDetail();
    renderProfile();
  });
}

document.addEventListener("DOMContentLoaded", init);
