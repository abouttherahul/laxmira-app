// public/js/layout.js
async function loadLayout() {
    try {
      const [header, footer] = await Promise.all([
        fetch("/components/header.html").then(r => r.text()),
        fetch("/components/footer.html").then(r => r.text())
      ]);
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
    if (id) document.getElementById(id)?.classList.add("underline", "text-white");
  }
  