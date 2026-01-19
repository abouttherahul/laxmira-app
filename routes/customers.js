// 🔧 REPLACE customer.js completely:
const express = require("express");
const db = require("../db/database");
const router = express.Router();

// 👥 Get all customers with summary (FIXED: uses orders + order_items)
router.get("/", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        c.id, c.name, c.phone, c.address, c.created_at,
        COUNT(DISTINCT o.id) AS orders,
        COUNT(oi.id) AS total_items,
        COALESCE(SUM(oi.final_price), 0) AS total_spent
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY c.id
      ORDER BY datetime(c.created_at) DESC
    `).all();

    res.json(rows);
  } catch (err) {
    console.error("❌ Customers fetch error:", err);
    res.status(500).json({ error: "Failed to load customers" });
  }
});

// ➕ Add New Customer (UNCHANGED)
router.post("/", (req, res) => {
  const { name, phone, address } = req.body;

  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "Name and Phone are required" });
  }

  try {
    const existing = db.prepare("SELECT id FROM customers WHERE phone = ?").get(phone.trim());
    if (existing) {
      return res.status(400).json({ error: "Customer with this phone already exists" });
    }

    const info = db.prepare(`
      INSERT INTO customers (name, phone, address, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      name.trim(), 
      phone.trim(), 
      address?.trim() || "", 
      new Date().toISOString().slice(0, 10)
    );

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error("❌ Add customer error:", err);
    res.status(500).json({ error: "Failed to add customer" });
  }
});

// 🧾 Customer purchase history (FIXED: uses orders + order_items)
router.get("/:id/history", (req, res) => {
  const id = req.params.id;
  try {
    const rows = db.prepare(`
      SELECT 
        o.id AS order_id,
        o.date, 
        oi.qty, 
        oi.final_price AS total,
        oi.mrp,
        oi.discount_percent,
        p.name AS product_name, 
        p.sku, 
        p.image
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.customer_id = ?
      ORDER BY o.date DESC, oi.id
    `).all(id);

    const result = rows.map(r => {
      let imgPath = r.image || "";
      if (imgPath && !imgPath.startsWith("/uploads/") && !imgPath.startsWith("http")) {
        imgPath = `/uploads/${imgPath}`;
      }
      return { ...r, image: imgPath };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ History error:", err);
    res.status(500).json({ error: "Failed to load history" });
  }
});

module.exports = router;
