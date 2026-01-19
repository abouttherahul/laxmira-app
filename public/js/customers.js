
async function loadLayout() {
  const header = await fetch("/components/header.html").then(r => r.text());
  const footer = await fetch("/components/footer.html").then(r => r.text());
  document.getElementById("header").innerHTML = header;
  document.getElementById("footer").innerHTML = footer;
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
  highlightActiveMenu();
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
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("underline");
  }
}
loadLayout();

const token = localStorage.getItem("token");
if (!token) window.location.href = "/";

let customers = [];
let selectedId = null;

async function loadCustomers() {
  try {
    const res = await fetch("/api/customers");
    if (!res.ok) throw new Error("Failed to load customers");
    customers = await res.json();
    renderCustomers();
  } catch (err) { console.error("❌ Load error:", err); }
}

function renderCustomers() {
  const q = document.getElementById("search").value.toLowerCase();
  const ul = document.getElementById("customerList");
  ul.innerHTML = "";

  const filtered = customers.filter(c => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q));

  if (!filtered.length) {
    ul.innerHTML = `<li class="p-8 text-center text-gray-400">No customers found</li>`;
    return;
  }

  filtered.forEach(c => {
    const isSelected = c.id === selectedId;
    const li = document.createElement("li");
    li.className = `p-4 cursor-pointer transition-all hover:bg-gray-50 border-l-4 ${isSelected ? 'bg-blue-50 border-blue-500' : 'border-transparent'}`;
    
    li.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br ${isSelected ? 'from-blue-400 to-indigo-500 text-white' : 'from-gray-200 to-gray-300 text-gray-600'} flex items-center justify-center font-bold text-sm shadow-sm">
            ${c.name.charAt(0)}
          </div>
          <div>
            <div class="font-bold text-gray-800 text-sm">${c.name}</div>
            <div class="text-xs text-gray-500 font-mono">${c.phone}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-bold text-emerald-600 text-sm">₹${(c.total_spent || 0).toLocaleString('en-IN')}</div>
          <div class="text-xs text-gray-400">${c.orders || 0} Orders</div>
        </div>
      </div>
    `;
    li.onclick = () => selectCustomer(c);
    ul.appendChild(li);
  });
}

async function selectCustomer(c) {
  selectedId = c.id;
  
  document.getElementById("historyTitle").textContent = c.name;
  document.getElementById("historySubtitle").innerHTML = `<iconify-icon icon="mdi:phone" class="mr-1"></iconify-icon> ${c.phone} ${c.address ? `<span class="mx-2">•</span> <iconify-icon icon="mdi:map-marker" class="mr-1"></iconify-icon> ${c.address}` : ""}`;
  
  document.getElementById("customerStats").classList.remove("hidden");
  document.getElementById("customerStats").style.display = "flex"; // Force flex
  document.getElementById("statTotal").textContent = (c.total_spent || 0).toLocaleString('en-IN');
  document.getElementById("statOrders").textContent = c.orders || 0;

  renderCustomers();

  const tbody = document.getElementById("historyBody");
  tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-gray-400"><iconify-icon icon="mdi:loading" class="animate-spin text-3xl"></iconify-icon></td></tr>`;

  try {
    const res = await fetch(`/api/customers/${c.id}/history`);
    const data = await res.json();
    tbody.innerHTML = "";

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-gray-400">No purchase history found</td></tr>`;
      return;
    }

    data.forEach(h => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 transition-colors group";
      tr.innerHTML = `
        <td class="p-4 text-gray-500 font-mono text-xs whitespace-nowrap">${h.date}</td>
        <td class="p-4 text-center">
          <img src="${h.image || '/uploads/no-image.png'}" class="w-10 h-10 object-cover rounded-lg mx-auto shadow-sm border border-gray-100">
        </td>
        <td class="p-4">
          <div class="font-bold text-gray-800 text-sm">${h.product_name}</div>
          <div class="text-xs text-gray-400 font-mono">${h.sku}</div>
        </td>
        <td class="p-4 text-center font-bold text-gray-700">${h.qty}</td>
        <td class="p-4 text-right font-bold text-emerald-600">₹${Number(h.total || h.final_price).toLocaleString('en-IN')}</td>
        <td class="p-4 text-center">
          <button onclick="window.open('/invoice.html?order_id=${h.order_id}', '_blank')" 
            class="bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm hover:shadow inline-flex items-center gap-1 group-hover:bg-blue-50">
            <iconify-icon icon="mdi:printer" class="text-sm"></iconify-icon> Print
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-red-500">Error loading history</td></tr>`;
  }
}

function openModal() {
  document.getElementById("addModal").classList.remove("hidden");
  document.getElementById("newName").focus();
}

function closeModal() {
  document.getElementById("addModal").classList.add("hidden");
}

async function saveNewCustomer() {
  const name = document.getElementById("newName").value.trim();
  const phone = document.getElementById("newPhone").value.trim();
  const address = document.getElementById("newAddress").value.trim();

  if(!name || !phone) return alert("Please enter Name and Phone Number");

  try {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address })
    });
    if(!res.ok) throw new Error("Failed");

    alert("✅ Customer Added!");
    closeModal();
    loadCustomers();
    // Clear inputs
    document.getElementById("newName").value = "";
    document.getElementById("newPhone").value = "";
    document.getElementById("newAddress").value = "";
  } catch (err) { alert("❌ Error saving customer"); }
}

loadCustomers();
