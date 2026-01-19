const db = require("./db/database");
try {
  db.prepare("ALTER TABLE sales ADD COLUMN invoice_no TEXT").run();
  console.log("✅ Added invoice_no column!");
} catch (e) {
  console.log("ℹ️ Column invoice_no already exists.");
}