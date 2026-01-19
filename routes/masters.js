const express = require("express");
const db = require("../db/database");
const router = express.Router();

// helper
function table(type) {
  if (type === "categories") return "categories";
  if (type === "colors") return "colors";
  if (type === "fabrics") return "fabrics";
  return null;
}

// GET all
router.get("/:type", (req, res) => {
  const t = table(req.params.type);
  if (!t) return res.status(400).send("Invalid type");

  const rows = db.prepare(`SELECT * FROM ${t} ORDER BY name`).all();
  res.json(rows);
});

// ADD
router.post("/:type", (req, res) => {
  const t = table(req.params.type);
  if (!t) return res.status(400).send("Invalid type");

  const { name } = req.body;
  if (!name) return res.status(400).send("Name required");

  try {
    db.prepare(`INSERT INTO ${t} (name) VALUES (?)`).run(name.trim());
    res.json({ success: true });
  } catch (e) {
    res.status(400).send("Already exists");
  }
});

// DELETE
router.delete("/:type/:id", (req, res) => {
  const t = table(req.params.type);
  if (!t) return res.status(400).send("Invalid type");

  db.prepare(`DELETE FROM ${t} WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
