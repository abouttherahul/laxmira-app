
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

  const dateEl = document.getElementById("date");
  const catEl = document.getElementById("category");
  const amtEl = document.getElementById("amount");
  const noteEl = document.getElementById("note");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  let editId = null;
  dateEl.value = new Date().toISOString().slice(0,10);

  function formatDate(isoDate) {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
  }

  async function loadExpenses() {
    const from = document.getElementById("fromDate")?.value || "";
    const to = document.getElementById("toDate")?.value || "";
    const category = document.getElementById("filterCategory")?.value || "";

    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (category && category !== "") params.append("category", category);

    try {
      const res = await fetch("/api/expenses?" + params.toString());
      if (!res.ok) throw new Error("Failed to fetch");
      
      const data = await res.json();
      renderExpensesTable(data);
    } catch (err) {
      console.error("Load expenses error:", err);
      document.getElementById("tbody").innerHTML = `
        <tr><td colspan="6" class="text-center py-12 text-red-500">❌ Error loading expenses</td></tr>
      `;
    }
  }

  function renderExpensesTable(data) {
    const tbody = document.getElementById("tbody");
    tbody.innerHTML = "";
    let total = 0;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-gray-400 text-lg">No expenses found</td></tr>`;
      document.getElementById("total").textContent = "Total: ₹0";
      return;
    }

    data.forEach((e, index) => {
      total += Number(e.amount || 0);
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 transition-colors group";
      tr.innerHTML = `
        <td class="p-4 font-mono text-sm text-gray-600">${index + 1}</td>
        <td class="p-4 font-medium text-gray-800">${formatDate(e.date)}</td>
        <td class="p-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800">
            ${e.category}
          </span>
        </td>
        <td class="p-4 text-right">
          <span class="text-2xl font-bold text-emerald-600">₹${Number(e.amount).toLocaleString('en-IN')}</span>
        </td>
        <td class="p-4 text-gray-600 max-w-xs truncate">${e.note || '-'}</td>
        <td class="p-4 text-center">
          <button onclick='editExpense(${JSON.stringify(e)})' 
                  class="group/edit bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-xl shadow-sm hover:shadow-md transition-all inline-flex items-center gap-1 text-sm font-medium">
            <iconify-icon icon="clarity:edit-solid" class="text-lg"></iconify-icon>
            Edit
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById("total").innerHTML = `
      <span class="text-3xl font-bold text-emerald-600">Total: ₹${total.toLocaleString('en-IN')}</span>
      <span class="text-sm text-gray-500 ml-2">(${data.length} expenses)</span>
    `;
  }

  async function saveExpense() {
    const date = dateEl.value;
    const category = catEl.value;
    const amount = Number(amtEl.value || 0);
    const note = noteEl.value.trim();

    if (!date || !category || amount <= 0) {
      alert("Please fill date, category, and valid amount (> 0)");
      amtEl.focus();
      return;
    }

    try {
      let url = "/api/expenses";
      let method = "POST";

      if (editId) {
        url = `/api/expenses/${editId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, category, amount, note })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }

      // Success feedback
      saveBtn.innerHTML = '<iconify-icon icon="mdi:check-circle" class="text-emerald-400 mr-2"></iconify-icon>Saved!';
      saveBtn.className = "w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg";
      
      setTimeout(() => {
        cancelEdit();
        loadExpenses();
      }, 800);
      
    } catch (err) {
      alert("❌ " + err.message);
    }
  }

  function editExpense(e) {
    editId = e.id;
    dateEl.value = e.date;
    catEl.value = e.category;
    amtEl.value = e.amount;
    noteEl.value = e.note || "";
    saveBtn.innerHTML = '<iconify-icon icon="mdi:pencil" class="mr-2"></iconify-icon>Update Expense';
    saveBtn.classList.remove("from-emerald-500", "to-emerald-600");
    saveBtn.classList.add("from-blue-500", "to-blue-600");
    cancelBtn.classList.remove("hidden");
    dateEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    dateEl.focus();
  }

  function cancelEdit() {
    editId = null;
    dateEl.value = new Date().toISOString().slice(0,10);
    catEl.value = "";
    amtEl.value = "";
    noteEl.value = "";
    saveBtn.innerHTML = '<iconify-icon icon="mdi:plus-circle" class="mr-2"></iconify-icon>Add Expense';
    saveBtn.classList.remove("from-emerald-500", "to-emerald-600");
    saveBtn.classList.add("from-blue-500", "to-blue-600");
    cancelBtn.classList.add("hidden");
  }

  function setPreviousMonth() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    
    document.getElementById("fromDate").value = firstDay.toISOString().slice(0, 10);
    document.getElementById("toDate").value = lastDay.toISOString().slice(0, 10);
    loadExpenses();
  }

  function clearFilters() {
    document.getElementById("fromDate").value = "";
    document.getElementById("toDate").value = "";
    document.getElementById("filterCategory").value = "";
    loadExpenses();
  }

  // Auto-save on Enter
  document.addEventListener('DOMContentLoaded', () => {
    [dateEl, catEl, amtEl, noteEl].forEach(el => {
      el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveExpense();
      });
    });
  });

  // Init
  loadExpenses();
