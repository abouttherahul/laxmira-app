const express = require("express");
const db = require("../db/database");
const router = express.Router();

// ✅ GET expenses with optional filters
router.get("/", (req, res) => {
  const { from, to, category } = req.query;

  let where = [];
  let params = {};

  if (from) {
    where.push("date >= @from");
    params.from = from;
  }

  if (to) {
    where.push("date <= @to");
    params.to = to;
  }

  if (category) {
    where.push("category = @category");
    params.category = category;
  }

  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

  const rows = db.prepare(`
    SELECT * FROM expenses
    ${whereSql}
    ORDER BY date DESC, id DESC
  `).all(params);

  res.json(rows);
});

// ➕ Add expense
router.post("/", (req, res) => {
  const { date, category, amount, note } = req.body;

  db.prepare(`
    INSERT INTO expenses (date, category, amount, note)
    VALUES (?, ?, ?, ?)
  `).run(date, category, amount, note || "");

  res.json({ success: true });
});

// ✏️ Update expense
router.put("/:id", (req, res) => {
  const { date, category, amount, note } = req.body;

  db.prepare(`
    UPDATE expenses
    SET date=?, category=?, amount=?, note=?
    WHERE id=?
  `).run(date, category, amount, note || "", req.params.id);

  res.json({ success: true });
});

module.exports = router;
