const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("public/uploads"));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// API routes (NO AUTH BLOCKING)
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/expenses", require("./routes/expenses"));
app.use("/api/masters", require("./routes/masters"));
app.use("/api/customers", require("./routes/customers"));

const PORT = 3000;
app.listen(PORT, () => {
  console.log("✅ Server running: http://localhost:" + PORT);
});
