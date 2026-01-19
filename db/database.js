const Database = require("better-sqlite3");
const db = new Database("meeramoda.db");

// =======================
// 👤 Users
// =======================
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)`).run();

// =======================
// 📦 Products
// =======================
db.prepare(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  category TEXT,
  color TEXT,
  fabric TEXT,
  sku TEXT UNIQUE,
  image TEXT,
  cost_price REAL,
  sell_price REAL,
  stock_qty INTEGER,
  created_at TEXT
)`).run();

// ➕ Add missing product columns safely
try { db.prepare("ALTER TABLE products ADD COLUMN category TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN color TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN fabric TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN sku TEXT UNIQUE").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN image TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN cost_price REAL").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN sell_price REAL").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN stock_qty INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE products ADD COLUMN created_at TEXT").run(); } catch (e) {}

// =======================
// 🧾 Sales (KEEP FOR BACKWARDS COMPATIBILITY)
// =======================
db.prepare(`
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  total REAL,
  product_id INTEGER,
  qty INTEGER,
  profit REAL DEFAULT 0,
  customer_id INTEGER
)`).run();

// ➕ Add missing sales columns
try { db.prepare("ALTER TABLE sales ADD COLUMN product_id INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE sales ADD COLUMN qty INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE sales ADD COLUMN profit REAL DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE sales ADD COLUMN customer_id INTEGER").run(); } catch (e) {}

// =======================
// 🧑 Customers
// =======================
db.prepare(`
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT UNIQUE,
  address TEXT,
  created_at TEXT
)`).run();

// ➕ Add missing customer columns
try { db.prepare("ALTER TABLE customers ADD COLUMN address TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE customers ADD COLUMN created_at TEXT").run(); } catch (e) {}

// =======================
// 🔥 NEW: Orders (Multi-product bills)
// =======================
db.prepare(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  total_discount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  total_profit REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
)`).run();

// =======================
// 🔥 NEW: Order Items (Products within orders)
// =======================
db.prepare(`
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  mrp REAL NOT NULL,
  discount_percent REAL NOT NULL DEFAULT 0,
  final_price REAL NOT NULL,
  profit REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
)`).run();

// =======================
// 💸 Expenses
// =======================
db.prepare(`
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  category TEXT,
  amount REAL,
  note TEXT
)`).run();

// =======================
// 🗂️ Masters: Categories
// =======================
db.prepare(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE
)`).run();

// =======================
// 🎨 Masters: Colors
// =======================
db.prepare(`
CREATE TABLE IF NOT EXISTS colors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE
)`).run();

// =======================
// 🧵 Masters: Fabrics
// =======================
db.prepare(`
CREATE TABLE IF NOT EXISTS fabrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE
)`).run();

// =======================
// 🌱 Seed Default Masters
// =======================
function seedMasters() {
  const categories = [
    "Saree", "Kurti", "Suit Set", "Lehenga", "Co-ord Set",
    "Gown", "Dress", "Top", "Dupatta", "Blouse"
  ];

  const colors = [
    "Red", "Pink", "Yellow", "Green", "Blue", "Black",
    "White", "Cream", "Maroon", "Purple", "Grey", "Multicolor"
  ];

  const fabrics = [
    "Cotton", "Rayon", "Silk", "Georgette", "Chiffon", "Crepe",
    "Linen", "Velvet", "Satin", "Organza", "Net", "Banarasi Silk"
  ];

  const catStmt = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
  categories.forEach(c => catStmt.run(c));

  const colorStmt = db.prepare("INSERT OR IGNORE INTO colors (name) VALUES (?)");
  colors.forEach(c => colorStmt.run(c));

  const fabricStmt = db.prepare("INSERT OR IGNORE INTO fabrics (name) VALUES (?)");
  fabrics.forEach(f => fabricStmt.run(f));
}

// 🚀 Seed masters on startup
seedMasters();

module.exports = db;
