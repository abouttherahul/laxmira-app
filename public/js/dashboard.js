// ---------- Layout ----------
async function loadLayout() {
  try {
    const header = await fetch("/components/header.html").then(r => r.text());
    const footer = await fetch("/components/footer.html").then(r => r.text());
    document.getElementById("header").innerHTML = header;
    document.getElementById("footer").innerHTML = footer;

    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
    highlightActiveMenu();
  } catch (err) {
    console.error("Layout error:", err);
  }
}

function highlightActiveMenu() {
  const path = window.location.pathname;
  const map = {
    "/dashboard.html": "nav-dashboard",
    "/products.html": "nav-products",
    "/sales.html": "nav-sales",
    "/expenses.html": "nav-expenses",
    "/customers.html": "nav-customers"
  };
  const id = map[path];
  if (id) document.getElementById(id)?.classList.add("underline");
}

loadLayout();

// ---------- Auth ----------
const token = localStorage.getItem("token");
if (!token) window.location.href = "/";

// ---------- API ----------
async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function apiJson(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { ...(options.headers || {}) };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/";
    throw new Error("Unauthorized");
  }

  const data = await safeJson(res);
  if (!res.ok) throw new Error((data && data.error) ? data.error : `HTTP ${res.status}`);
  return data;
}

// ---------- Charts (prevent duplicates) ----------
let salesChartInstance = null;
let expensesChartInstance = null;
let profitChartInstance = null;

// ---------- Dashboard ----------
async function loadDashboardData() {
  try {
    const [productsRaw, salesRaw, expensesRaw, customersRaw] = await Promise.all([
      apiJson("/api/products"),
      apiJson("/api/sales"),
      apiJson("/api/expenses"),
      apiJson("/api/customers")
    ]);

    const products = Array.isArray(productsRaw) ? productsRaw : [];
    const sales = Array.isArray(salesRaw) ? salesRaw : [];
    const expenses = Array.isArray(expensesRaw) ? expensesRaw : [];
    const customers = Array.isArray(customersRaw) ? customersRaw : [];

    updateCounts(products, sales, expenses);
    renderLatestProducts(sales);
    renderTopCustomers(customers);
    renderCharts(sales, expenses);
  } catch (err) {
    console.error("Dashboard error:", err);
    document.getElementById("latestProducts").innerHTML =
      `<tr><td colspan="4" class="text-center p-6 text-red-500">Error: ${err.message}</td></tr>`;
  }
}

function updateCounts(products, sales, expenses) {
  document.getElementById("products").textContent = products.length.toLocaleString();

  const totalSales = sales.reduce((sum, item) => sum + Number(item.total || 0), 0);
  document.getElementById("sales").textContent = `₹${totalSales.toLocaleString("en-IN")}`;

  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  document.getElementById("expenses").textContent = `₹${totalExpenses.toLocaleString("en-IN")}`;

  const profit = totalSales - totalExpenses;
  const profitEl = document.getElementById("profit");
  profitEl.textContent = `₹${profit.toLocaleString("en-IN")}`;
  profitEl.classList.toggle("text-red-600", profit < 0);
  profitEl.classList.toggle("text-emerald-600", profit >= 0);
}

function renderLatestProducts(sales) {
  const tbody = document.getElementById("latestProducts");
  tbody.innerHTML = "";

  const latest = sales.slice(0, 8);
  if (!latest.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center p-6 text-gray-400">No recent sales</td></tr>`;
    return;
  }

  latest.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-4 text-left">${s.product_name || "-"}</td>
      <td class="p-3 text-center">${s.qty ?? "-"}</td>
      <td class="p-3 text-right">₹${Number(s.total || 0).toLocaleString("en-IN")}</td>
      <td class="p-3 text-right">${s.date || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTopCustomers(customers) {
  const container = document.getElementById("topCustomers");
  container.innerHTML = "";

  const top = customers
    .filter(c => Number(c.total_spent || 0) > 0)
    .sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0))
    .slice(0, 5);

  if (!top.length) {
    container.innerHTML = `<div class="text-center p-6 text-gray-400 text-sm">No customers yet</div>`;
    return;
  }

  top.forEach(c => {
    const div = document.createElement("div");
    div.className = "flex justify-between items-center p-3 bg-white rounded-xl shadow-sm";
    div.innerHTML = `
      <div>
        <div class="font-semibold text-gray-800">${c.name || "-"}</div>
        <div class="text-xs text-gray-500">${c.phone || "-"}</div>
      </div>
      <div class="text-right">
        <div class="font-bold text-emerald-600">₹${Number(c.total_spent || 0).toLocaleString("en-IN")}</div>
        <div class="text-xs text-gray-400">${c.orders || 0} orders</div>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderCharts(sales, expenses) {
  if (typeof Chart === "undefined") {
    console.error("Chart.js not loaded (Chart is undefined).");
    return;
  }

  renderSalesChart(sales);
  renderExpensesChart(expenses);
  renderProfitChart(sales, expenses);
}

function renderSalesChart(sales) {
  const ctx = document.getElementById("salesChart");
  if (salesChartInstance) salesChartInstance.destroy();

  const map = sales.reduce((m, s) => {
    const d = s.date || "";
    m[d] = (m[d] || 0) + Number(s.total || 0);
    return m;
  }, {});
  const labels = Object.keys(map).slice(-7);
  const values = labels.map(d => map[d]);

  salesChartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ data: values, borderColor: "#f97316", fill: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function renderExpensesChart(expenses) {
  const ctx = document.getElementById("expensesChart");
  if (expensesChartInstance) expensesChartInstance.destroy();

  const map = expenses.reduce((m, e) => {
    const d = e.date || "";
    m[d] = (m[d] || 0) + Number(e.amount || 0);
    return m;
  }, {});
  const labels = Object.keys(map).slice(-7);
  const values = labels.map(d => map[d]);

  expensesChartInstance = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: "#ef4444" }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function renderProfitChart(sales, expenses) {
  const ctx = document.getElementById("profitChart");
  if (profitChartInstance) profitChartInstance.destroy();

  const saleMap = sales.reduce((m, s) => ((m[s.date] = (m[s.date] || 0) + Number(s.total || 0)), m), {});
  const expMap = expenses.reduce((m, e) => ((m[e.date] = (m[e.date] || 0) + Number(e.amount || 0)), m), {});

  const dates = Array.from(new Set([...Object.keys(saleMap), ...Object.keys(expMap)])).slice(-7).sort();
  const profit = dates.map(d => (saleMap[d] || 0) - (expMap[d] || 0));

  profitChartInstance = new Chart(ctx, {
    type: "line",
    data: { labels: dates, datasets: [{ data: profit, borderColor: "#10b981", fill: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

window.addEventListener("load", loadDashboardData);
