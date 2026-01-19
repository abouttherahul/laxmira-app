// 🔧 REPLACE your product.js with this FIXED version:
const express = require("express");
const db = require("../db/database");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// 📸 Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 🏷️ SKU generator
function generateSKU({ category, color, fabric }) {
  const c = category.trim().slice(0, 2).toUpperCase();
  const col = color.trim().slice(0, 2).toUpperCase();
  const f = fabric.trim().slice(0, 2).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LX-${c}-${col}-${f}-${rand}`;
}

// ✅ FIXED: Add /search endpoint for sales.html autocomplete
router.get("/search", (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  
  try {
    const rows = db.prepare(`
      SELECT id, name, sku, sell_price, stock_qty, image
      FROM products 
      WHERE name LIKE ? OR sku LIKE ?
      ORDER BY name
      LIMIT 20
    `).all([`%${q}%`, `%${q}%`]);
    
    const result = rows.map(r => {
      let imgPath = r.image || "";
      if (imgPath && !imgPath.startsWith("/uploads/")) imgPath = `/uploads/${imgPath}`;
      return { ...r, image: imgPath };
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// 📦 Get all products (UNCHANGED)
router.get("/", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT *
      FROM products
      ORDER BY 
        CASE WHEN created_at IS NULL THEN 1 ELSE 0 END,
        datetime(created_at) DESC,
        id DESC
    `).all();
    res.json(rows);
  } catch (err) {
    console.error("❌ Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ➕ Add product (FIXED: better validation + error handling)
router.post("/", upload.single("image"), (req, res) => {
  const { name, category, color, fabric, cost_price, sell_price, stock_qty } = req.body;

  if (!name?.trim() || !category?.trim() || !color?.trim() || !fabric?.trim()) {
    return res.status(400).json({ error: "Name, category, color, fabric required" });
  }

  let sku, exists = true;
  
  try {
    // Generate unique SKU
    while (exists) {
      sku = generateSKU({ category, color, fabric });
      const row = db.prepare("SELECT id FROM products WHERE sku=?").get(sku);
      exists = !!row;
    }

    const createdAt = new Date().toISOString().slice(0, 10);

    const result = db.prepare(`
      INSERT INTO products
      (name, category, color, fabric, sku, image, cost_price, sell_price, stock_qty, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
      name.trim(),
      category.trim(),
      color.trim(),
      fabric.trim(),
      sku,
      req.file ? `/uploads/${req.file.filename}` : null,
      Number(cost_price || 0),
      Number(sell_price || 0),
      Math.max(0, Number(stock_qty || 0)), // Prevent negative stock
      createdAt
    );

    res.json({ success: true, id: result.lastInsertRowid, sku, created_at: createdAt });
  } catch (err) {
    console.error("❌ Insert error:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// ✏️ Update product (UNCHANGED)
router.put("/:id", upload.single("image"), (req, res) => {
  const { name, category, color, fabric, cost_price, sell_price, stock_qty } = req.body;
  const id = req.params.id;

  try {
    let query = `
      UPDATE products
      SET name=?, category=?, color=?, fabric=?,
          cost_price=?, sell_price=?, stock_qty=?
    `;
    const params = [
      name?.trim() || "",
      category?.trim() || "",
      color?.trim() || "",
      fabric?.trim() || "",
      Number(cost_price || 0),
      Number(sell_price || 0),
      Math.max(0, Number(stock_qty || 0))
    ];

    if (req.file) {
      query += `, image=?`;
      params.push(`/uploads/${req.file.filename}`);
    }

    query += ` WHERE id=?`;
    params.push(id);

    const result = db.prepare(query).run(...params);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

module.exports = router;
