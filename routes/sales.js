const express = require("express");
const db = require("../db/database");
const router = express.Router();

// =======================
// 📊 Get sales (BACKWARDS COMPATIBLE - works with order_items)
// =======================
router.get("/", (req, res) => {
  const { from, to, product } = req.query;

  let where = [];
  let params = {};

  if (from) {
    where.push("o.date >= @from");
    params.from = from;
  }
  if (to) {
    where.push("o.date <= @to");
    params.to = to;
  }
  if (product) {
    where.push("(p.name LIKE @product OR p.sku LIKE @product)");
    params.product = `%${product}%`;
  }

  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

  try {
    // 👉 Query order_items instead of old sales table
    const rows = db.prepare(`
      SELECT 
        o.date,
        p.name AS product_name,
        p.sku AS sku,
        p.image AS image,
        oi.qty,
        oi.final_price AS total,
        oi.profit,
        (SELECT stock_qty FROM products p2 WHERE p2.id = oi.product_id) AS stock_after
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      ${whereSql}
      ORDER BY o.date DESC, oi.id DESC
    `).all(params);

    const result = rows.map(r => {
      let imgPath = r.image || "";
      if (imgPath && !imgPath.startsWith("/uploads/") && !imgPath.startsWith("http")) {
        imgPath = `/uploads/${imgPath}`;
      }

      const qty = Number(r.qty || 0);
      const stockAfter = Number(r.stock_after || 0);

      return {
        date: r.date,
        product_name: r.product_name,
        sku: r.sku,
        image: imgPath,
        qty,
        stock_before: stockAfter + qty,
        stock_after: stockAfter,
        total: Number(r.total || 0),
        profit: Number(r.profit || 0)
      };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ Sales fetch error:", err);
    res.status(500).json({ error: "Failed to load sales" });
  }
});

// =======================
// ➕ Add multi-product order (NEW ENDPOINT)
// =======================
router.post("/", (req, res) => {
  const { date, customer, items } = req.body;

  // Validation
  if (!date || !customer?.name || !customer?.phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Missing required fields: date, customer, or items array" });
  }

  const dbTransaction = db.transaction(() => {
    // 1. 🧑 Find or create customer
    let cust = db.prepare("SELECT id FROM customers WHERE phone=?").get(customer.phone);
    let customerId;

    if (cust) {
      customerId = cust.id;
    } else {
      const custInfo = db.prepare(`
        INSERT INTO customers (name, phone, address, created_at)
        VALUES (?,?,?,?)
      `).run(customer.name, customer.phone, customer.address || "", date);
      customerId = custInfo.lastInsertRowid;
    }

    // 2. 🧾 Calculate order totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalAmount = 0;
    let totalProfit = 0;

    // 3. 📦 Check stock & calculate per item
    for (const item of items) {
      const product = db.prepare(
        "SELECT id, stock_qty, sell_price, cost_price FROM products WHERE id=?"
      ).get(item.product_id);

      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const saleQty = Number(item.qty);
      const stockQty = Number(product.stock_qty || 0);

      if (saleQty > stockQty) {
        throw new Error(`Insufficient stock for ${product.sku || product.id}. Need ${saleQty}, have ${stockQty}`);
      }

      // Profit per item: (mrp - cost_price) * qty
      const itemProfit = (Number(product.cost_price || 0) * saleQty); // Wait, no:
      // Actually: profit = (final_price - cost_price) * qty, but since final_price already calculated in frontend
      // We'll use frontend's final_price for consistency, but verify against sell_price
      const expectedMRP = Number(product.sell_price || 0);
      if (item.mrp > expectedMRP * 1.2) { // Allow 20% flexibility
        console.warn(`MRP ${item.mrp} exceeds expected ${expectedMRP} for ${product.sku}`);
      }

      subtotal += Number(item.mrp) * saleQty;
      totalDiscount += (Number(item.mrp) * saleQty * (item.discountPercent || 0) / 100);
      totalAmount += Number(item.finalPrice);
      totalProfit += (Number(item.finalPrice) - (Number(product.cost_price || 0) * saleQty));

      // 4. 📉 Reduce stock immediately
      db.prepare("UPDATE products SET stock_qty=? WHERE id=?")
        .run(stockQty - saleQty, item.product_id);
    }

    // 5. 💰 Create order
    const orderInfo = db.prepare(`
      INSERT INTO orders (customer_id, date, subtotal, total_discount, total_amount, total_profit)
      VALUES (?,?,?,?,?,?)
    `).run(customerId, date, subtotal, totalDiscount, totalAmount, totalProfit);

    const orderId = orderInfo.lastInsertRowid;

    // 6. 📋 Create order_items
    for (const item of items) {
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, qty, mrp, discount_percent, final_price, profit)
        VALUES (?,?,?,?,?,?,?)
      `).run(
        orderId,
        item.product_id,
        item.qty,
        item.mrp,
        item.discountPercent || 0,
        item.finalPrice,
        (item.finalPrice - (Number(item.qty) * Number(db.prepare("SELECT cost_price FROM products WHERE id=?").get(item.product_id)?.cost_price || 0)))
      );
    }

    return { orderId, customerId };
  });

  try {
    const result = dbTransaction();
    res.json({
      success: true,
      order_id: result.orderId,
      message: `Order #${result.orderId} created with ${items.length} items`
    });
  } catch (err) {
    console.error("❌ Add order error:", err);
    res.status(400).json({ error: err.message || "Failed to add order" });
  }
});

// =======================
// 📄 Get order for invoice (NEW - replaces old /:id)
// =======================
router.get("/:id", (req, res) => {
  const id = req.params.id;

  try {
    // Get order header
    const order = db.prepare(`
      SELECT 
        o.id, o.date, o.subtotal, o.total_discount, o.total_amount, o.total_profit,
        c.name AS customer_name, c.phone AS customer_phone, c.address AS customer_address
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Get order items
    const items = db.prepare(`
      SELECT 
        oi.qty, oi.mrp, oi.discount_percent, oi.final_price, oi.profit,
        p.name AS product_name, p.sku, p.image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `).all(id);

    // Fix image paths
    items.forEach(item => {
      let imgPath = item.image || "";
      if (imgPath && !imgPath.startsWith("/uploads/") && !imgPath.startsWith("http")) {
        imgPath = `/uploads/${imgPath}`;
      }
      item.image = imgPath;
    });

    res.json({
      ...order,
      items
    });
  } catch (err) {
    console.error("❌ Invoice fetch error:", err);
    res.status(500).json({ error: "Failed to load invoice" });
  }
});

module.exports = router;
