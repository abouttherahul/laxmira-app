
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

  const saleDateEl = document.getElementById("saleDate");
  const productRowsContainer = document.getElementById("productRows");
  const grandTotalEl = document.getElementById("grandTotal");
  const grandTotalDisplay = document.getElementById("grandTotalDisplay");

  saleDateEl.value = new Date().toISOString().slice(0, 10);

  let products = []; 

  async function loadProducts() {
    try {
      const res = await apiFetch("/api/products");
      products = await res.json();
    } catch(e) { console.error(e); }
  }

  function addProductRow(prefill) {
    const rowId = "row-" + Date.now() + "-" + Math.floor(Math.random() * 9999);
    const row = document.createElement("div");
    row.className = "grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm relative group";
    row.dataset.rowId = rowId;

    row.innerHTML = `
      <div class="col-span-5 relative">
        <label class="block md:hidden text-xs font-bold text-gray-500 mb-1">Product</label>
        <input type="text" class="border border-gray-300 rounded-lg p-3 w-full text-sm font-medium product-search focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="🔍 Type product name or SKU..." oninput="onProductSearchInput(this)" autocomplete="off">
        <div class="absolute z-50 bg-white border border-gray-200 rounded-lg mt-1 w-full max-h-60 overflow-y-auto shadow-xl hidden suggestion-box"></div>
        <input type="hidden" class="product-id">
        <div class="text-xs text-gray-400 mt-1 ml-1 stock-hint"></div>
      </div>

      <div class="col-span-2">
        <label class="block md:hidden text-xs font-bold text-gray-500 mb-1">Qty</label>
        <input type="number" class="border border-gray-300 rounded-lg p-3 w-full text-center font-bold qty-input" min="1" value="1">
      </div>

      <div class="col-span-2">
        <label class="block md:hidden text-xs font-bold text-gray-500 mb-1">MRP</label>
        <input type="number" class="border border-gray-300 rounded-lg p-3 w-full text-center mrp-input" placeholder="0.00">
      </div>

      <div class="col-span-1">
        <label class="block md:hidden text-xs font-bold text-gray-500 mb-1">Disc %</label>
        <input type="number" class="border border-gray-300 rounded-lg p-3 w-full text-center text-red-500 discount-input" placeholder="0">
      </div>

      <div class="col-span-2 flex items-center gap-2">
        <div class="w-full">
          <label class="block md:hidden text-xs font-bold text-gray-500 mb-1">Total</label>
          <input type="number" class="border border-gray-300 bg-gray-100 rounded-lg p-3 w-full text-right font-bold text-emerald-600 line-total-input" readonly placeholder="0.00">
        </div>
        <button type="button" onclick="removeProductRow('${rowId}')" class="bg-red-50 hover:bg-red-100 text-red-500 p-3 rounded-lg transition mt-4 md:mt-0">
          <iconify-icon icon="mdi:trash-can-outline" class="text-lg"></iconify-icon>
        </button>
      </div>
    `;

    productRowsContainer.appendChild(row);

    const qtyInput = row.querySelector(".qty-input");
    const mrpInput = row.querySelector(".mrp-input");
    const discInput = row.querySelector(".discount-input");
    const lineTotalInput = row.querySelector(".line-total-input");

    const recalc = () => {
      const qty = Number(qtyInput.value || 0);
      const mrp = Number(mrpInput.value || 0);
      const disc = Number(discInput.value || 0);
      const mrpTotal = qty * mrp;
      const final = mrpTotal - (mrpTotal * disc / 100);
      lineTotalInput.value = final.toFixed(2);
      recalcGrandTotal();
    };

    qtyInput.addEventListener("input", recalc);
    mrpInput.addEventListener("input", recalc);
    discInput.addEventListener("input", recalc);

    if (prefill) {
      row.querySelector(".product-id").value = prefill.id;
      row.querySelector(".product-search").value = `${prefill.name}`;
      mrpInput.value = prefill.sell_price || 0;
      recalc();
    }
  }

  function removeProductRow(rowId) {
    const row = [...productRowsContainer.children].find(r => r.dataset.rowId === rowId);
    if (row) {
      productRowsContainer.removeChild(row);
      recalcGrandTotal();
    }
  }

  function recalcGrandTotal() {
    let sum = 0;
    const rows = productRowsContainer.querySelectorAll(".line-total-input");
    rows.forEach(inp => sum += Number(inp.value || 0));
    grandTotalEl.value = sum.toFixed(2);
    grandTotalDisplay.textContent = sum.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  }

  function onProductSearchInput(inputEl) {
    const wrapper = inputEl.closest("div.col-span-5");
    const box = wrapper.querySelector(".suggestion-box");
    const hiddenId = wrapper.querySelector(".product-id");
    const stockHint = wrapper.querySelector(".stock-hint");

    const q = inputEl.value.trim().toLowerCase();
    box.innerHTML = "";
    hiddenId.value = "";
    stockHint.textContent = "";

    if (!q || !products.length) {
      box.classList.add("hidden");
      return;
    }

    const matches = products.filter(p =>
      p.name.toLowerCase().includes(q) || String(p.sku || "").toLowerCase().includes(q)
    ).slice(0, 10);

    if (!matches.length) {
      box.classList.add("hidden");
      return;
    }

    matches.forEach(p => {
      const item = document.createElement("div");
      item.className = "px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex justify-between items-center";
      item.innerHTML = `
        <div>
          <div class="font-bold text-gray-800 text-sm">${p.name}</div>
          <div class="text-xs text-gray-500 font-mono">${p.sku}</div>
        </div>
        <div class="text-right">
          <div class="font-bold text-emerald-600 text-sm">₹${p.sell_price}</div>
          <div class="text-xs ${p.stock_qty < 5 ? 'text-red-500 font-bold' : 'text-gray-400'}">Stock: ${p.stock_qty}</div>
        </div>
      `;
      item.onclick = () => {
        inputEl.value = `${p.name} [${p.sku}]`;
        hiddenId.value = p.id;
        stockHint.innerHTML = `Stock Available: <span class="font-bold ${p.stock_qty < 5 ? 'text-red-500' : 'text-emerald-600'}">${p.stock_qty}</span>`;
        box.classList.add("hidden");

        const row = inputEl.closest(".grid");
        const mrpInput = row.querySelector(".mrp-input");
        const qtyInput = row.querySelector(".qty-input");
        const discInput = row.querySelector(".discount-input");
        const lineTotalInput = row.querySelector(".line-total-input");

        if (mrpInput) mrpInput.value = p.sell_price;
        if (!qtyInput.value) qtyInput.value = 1;

        const recalc = () => {
          const qty = Number(qtyInput.value || 0);
          const mrp = Number(mrpInput.value || 0);
          const disc = Number(discInput.value || 0);
          const mrpTotal = qty * mrp;
          const final = mrpTotal - (mrpTotal * disc / 100);
          lineTotalInput.value = final.toFixed(2);
          recalcGrandTotal();
        };
        recalc();
      };
      box.appendChild(item);
    });
    box.classList.remove("hidden");
  }

  async function submitOrder() {
    const date = saleDateEl.value;
    const cname = document.getElementById("customerName").value.trim();
    const cphone = document.getElementById("customerPhone").value.trim();
    const caddr = document.getElementById("customerAddress").value.trim();

    if (!date || !cname || !cphone) return alert("Please fill date, customer name and phone.");

    const rows = [...productRowsContainer.children];
    if (!rows.length) return alert("Add at least one product.");

    const items = [];
    for (const row of rows) {
      const pid = row.querySelector(".product-id").value;
      const qty = Number(row.querySelector(".qty-input").value || 0);
      const mrp = Number(row.querySelector(".mrp-input").value || 0);
      const disc = Number(row.querySelector(".discount-input").value || 0);
      const lineTotal = Number(row.querySelector(".line-total-input").value || 0);

      if (!pid || qty <= 0) return alert("Check product rows (missing product or invalid qty).");

      items.push({ product_id: Number(pid), qty, mrp, discountPercent: disc, finalPrice: lineTotal });
    }

    try {
      const res = await apiFetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, customer: { name: cname, phone: cphone, address: caddr }, items })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("✅ Sale completed!");
      document.getElementById("customerName").value = "";
      document.getElementById("customerPhone").value = "";
      document.getElementById("customerAddress").value = "";
      productRowsContainer.innerHTML = "";
      grandTotalEl.value = "0";
      grandTotalDisplay.textContent = "0.00";
      addProductRow();
      loadSales();
      loadProducts();

      if (data.order_id) window.open(`/invoice.html?order_id=${data.order_id}`, "_blank");

    } catch (err) { alert("❌ " + err.message); }
  }

  async function loadSales() {
    const from = document.getElementById("fromDate").value;
    const to = document.getElementById("toDate").value;
    const product = document.getElementById("productFilter").value;
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (product) params.append("product", product);

    const res = await apiFetch("/api/sales?" + params.toString());
    const data = await res.json();
    const tbody = document.getElementById("tbody");
    tbody.innerHTML = "";

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-400">No sales found</td></tr>`;
      return;
    }

    data.forEach(s => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 border-b border-gray-100";
      tr.innerHTML = `
        <td class="p-4 text-sm text-gray-600 font-mono">${s.date}</td>
        <td class="p-4 text-center">
          <img src="${s.image || '/uploads/no-image.png'}" class="w-10 h-10 object-cover rounded-lg mx-auto shadow-sm">
        </td>
        <td class="p-4">
          <div class="font-bold text-gray-800 text-sm">${s.product_name}</div>
          <div class="text-xs text-gray-400">${s.sku}</div>
        </td>
        <td class="p-4 text-center text-sm">
          <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">${s.stock_before}</span>
          <span class="text-red-500 font-bold mx-1">↓${s.qty}</span>
          <span class="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-xs font-bold">${s.stock_after}</span>
        </td>
        <td class="p-4 text-right font-bold text-gray-700">₹${s.total}</td>
        <td class="p-4 text-right font-bold text-emerald-600">+₹${s.profit}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  loadProducts();
  addProductRow();
  loadSales();
