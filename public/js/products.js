// Products page logic ONLY - NO auto-init
const token = localStorage.getItem("token");
if (!token) window.location.href = "/";

// DOM elements (wait for DOM ready)
let nameEl, categoryEl, colorEl, fabricEl, costEl, priceEl, qtyEl, imageEl;
let searchInput, filterColor, filterFabric, submitBtn, cancelBtn;

let editId = null;
let allProducts = [];

// apiFetch helper (SHARED)
function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, { ...options, headers });
}

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB');
}

function fillSelect(id, data) {
  const sel = document.getElementById(id);
  const label = id.charAt(0).toUpperCase() + id.slice(1);
  sel.innerHTML = `<option value="">Select ${label}</option>`;
  data.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.name;
    opt.textContent = item.name;
    sel.appendChild(opt);
  });
}

// Load masters
async function loadMasters() {
  try {
    const [cats, colors, fabrics] = await Promise.all([
      apiFetch("/api/masters/categories").then(r => r.json()),
      apiFetch("/api/masters/colors").then(r => r.json()),
      apiFetch("/api/masters/fabrics").then(r => r.json())
    ]);
    fillSelect("category", cats);
    fillSelect("color", colors);
    fillSelect("fabric", fabrics);
  } catch (err) {
    console.error("Masters load error:", err);
  }
}

// Load products
async function loadProducts() {
  try {
    const res = await apiFetch("/api/products");
    if (!res.ok) throw new Error("Failed to fetch");
    allProducts = await res.json();
    applyFilters();
  } catch (err) {
    console.error("Products load error:", err);
  }
}

function renderProducts(list) {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";
  document.getElementById("productCount").textContent = list.length;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="12" class="text-center py-20 text-gray-400 text-xl">No products found</td></tr>`;
    return;
  }

  list.forEach((p, i) => {
    const stockClass = p.stock_qty < 5 ? "text-red-600 font-bold" : "text-emerald-600 font-bold";
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all group";
    tr.innerHTML = `
      <td class="p-4 font-mono text-sm text-gray-600">${i + 1}</td>
      <td class="p-4">
        <img src="${p.image || '/uploads/no-image.png'}" 
             class="w-20 h-20 object-cover rounded-2xl mx-auto shadow-lg border-2 border-white group-hover:scale-110 transition-transform duration-200"/>
      </td>
      <td class="p-4 text-left"><div class="font-bold text-lg text-gray-800">${p.name}</div></td>
      <td class="p-4"><span class="inline-block bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 px-4 py-2 rounded-xl font-mono text-sm font-bold shadow-sm">${p.sku || "-"}</span></td>
      <td class="p-4 text-sm text-gray-600 font-medium">${formatDate(p.created_at)}</td>
      <td class="p-4"><span class="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">${p.category}</span></td>
      <td class="p-4"><span class="inline-block bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-xs font-semibold">${p.color}</span></td>
      <td class="p-4"><span class="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold">${p.fabric}</span></td>
      <td class="p-4 text-right text-gray-600 font-mono text-lg">₹${Number(p.cost_price).toLocaleString('en-IN')}</td>
      <td class="p-4 text-right text-emerald-600 font-mono text-xl font-bold">₹${Number(p.sell_price).toLocaleString('en-IN')}</td>
      <td class="p-4 text-center ${stockClass} text-2xl">${p.stock_qty}</td>
      <td class="p-4">
        <div class="flex items-center justify-center gap-3">
          <button onclick='editProduct(${JSON.stringify(p).replace(/'/g, "\\'")})' class="bg-blue-100 hover:bg-blue-200 text-blue-700 p-3 rounded-xl shadow-sm hover:shadow-lg transition-all">
            <iconify-icon icon="clarity:edit-solid" class="text-2xl"></iconify-icon>
          </button>
          <button onclick='duplicateProduct(${JSON.stringify(p).replace(/'/g, "\\'")})' title="Duplicate" class="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-3 rounded-xl shadow-sm hover:shadow-lg transition-all">
            <iconify-icon icon="mdi:content-copy" class="text-2xl"></iconify-icon>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function applyFilters() {
  const q = searchInput.value.toLowerCase();
  const c = filterColor.value.toLowerCase();
  const f = filterFabric.value.toLowerCase();

  const filtered = allProducts.filter(p => {
    const name = (p.name || "").toLowerCase();
    const sku = (p.sku || "").toLowerCase();
    return (!q || name.includes(q) || sku.includes(q)) &&
           (!c || (p.color || "").toLowerCase().includes(c)) &&
           (!f || (p.fabric || "").toLowerCase().includes(f));
  });

  renderProducts(filtered);
}

function clearFilters() {
  searchInput.value = filterColor.value = filterFabric.value = "";
  applyFilters();
}

// Add/Edit Product
async function addProduct() {
  if (!nameEl.value.trim() || !categoryEl.value || !colorEl.value || !fabricEl.value) {
    alert("⚠️ Please fill all required fields");
    return;
  }

  const formData = new FormData();
  formData.append("name", nameEl.value.trim());
  formData.append("category", categoryEl.value);
  formData.append("color", colorEl.value);
  formData.append("fabric", fabricEl.value);
  formData.append("cost_price", costEl.value || 0);
  formData.append("sell_price", priceEl.value || 0);
  formData.append("stock_qty", qtyEl.value || 0);
  if (imageEl.files[0]) formData.append("image", imageEl.files[0]);

  try {
    let url = "/api/products", method = "POST";
    if (editId) { url += `/${editId}`; method = "PUT"; }

    submitBtn.disabled = true;
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<iconify-icon icon="mdi:loading" class="animate-spin text-3xl"></iconify-icon> Saving...';

    const res = await apiFetch(url, { method, body: formData });
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || "Failed to save");

    alert(`✅ ${editId ? 'Updated' : 'Added'} successfully! SKU: ${data.sku || 'N/A'}`);
    cancelEdit();
    loadProducts();
  } catch (err) {
    alert("❌ Error: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHTML; // ✅ FIXED: Restore button
  }
}

function editProduct(p) {
  editId = p.id;
  nameEl.value = p.name || "";
  categoryEl.value = p.category || "";
  colorEl.value = p.color || "";
  fabricEl.value = p.fabric || "";
  costEl.value = p.cost_price || "";
  priceEl.value = p.sell_price || "";
  qtyEl.value = p.stock_qty || "";
  imageEl.value = "";

  document.getElementById("formTitle").textContent = "Edit Product";
  submitBtn.innerHTML = '<iconify-icon icon="mdi:update" class="text-3xl"></iconify-icon> Update Product';
  submitBtn.classList.remove("from-blue-500", "to-indigo-600");
  submitBtn.classList.add("from-emerald-500", "to-emerald-600");
  cancelBtn.classList.remove("hidden");
  
  window.scrollTo({ top: 0, behavior: "smooth" });
  nameEl.focus();
}

function duplicateProduct(p) {
  editId = null;
  nameEl.value = p.name;
  categoryEl.value = p.category;
  colorEl.value = p.color;
  fabricEl.value = p.fabric;
  costEl.value = p.cost_price;
  priceEl.value = p.sell_price;
  qtyEl.value = p.stock_qty;
  imageEl.value = "";

  document.getElementById("formTitle").textContent = "Duplicate Product";
  submitBtn.innerHTML = '<iconify-icon icon="mdi:content-copy" class="text-3xl"></iconify-icon> Add Duplicate';
  cancelBtn.classList.remove("hidden");
  
  window.scrollTo({ top: 0, behavior: "smooth" });
  nameEl.focus();
}

function cancelEdit() {
  editId = null;
  [nameEl, categoryEl, colorEl, fabricEl, costEl, priceEl, qtyEl].forEach(el => el.value = "");
  imageEl.value = "";
  
  document.getElementById("formTitle").textContent = "Add New Product";
  submitBtn.innerHTML = '<iconify-icon icon="mdi:plus-circle" class="text-3xl"></iconify-icon> Add Product';
  submitBtn.classList.remove("from-emerald-500", "to-emerald-600");
  submitBtn.classList.add("from-blue-500", "to-indigo-600");
  cancelBtn.classList.add("hidden");
}

// ✅ EXPORTS for HTML onclick handlers
window.editProduct = editProduct;
window.duplicateProduct = duplicateProduct;
window.addProduct = addProduct;
window.clearFilters = clearFilters;

// Products-specific init (called from HTML after DOM ready)
async function initProducts() {
  // Cache DOM elements
  nameEl = document.getElementById("name");
  categoryEl = document.getElementById("category");
  colorEl = document.getElementById("color");
  fabricEl = document.getElementById("fabric");
  costEl = document.getElementById("cost");
  priceEl = document.getElementById("price");
  qtyEl = document.getElementById("qty");
  imageEl = document.getElementById("image");
  searchInput = document.getElementById("searchInput");
  filterColor = document.getElementById("filterColor");
  filterFabric = document.getElementById("filterFabric");
  submitBtn = document.getElementById("submitBtn");
  cancelBtn = document.getElementById("cancelBtn");

  await loadMasters();
  await loadProducts();
}
