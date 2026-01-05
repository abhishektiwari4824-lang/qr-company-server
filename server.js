const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* ================= SESSION ================= */
app.use(
  session({
    name: "qr-company-session",
    secret: "qr-company-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 // 1 hour
    }
  })
);

/* ================= DATABASE ================= */
const dataFile = path.join(__dirname, "products.json");

function loadProducts() {
  try {
    if (!fs.existsSync(dataFile)) {
      fs.writeFileSync(dataFile, "[]");
      return [];
    }
    return JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  } catch (err) {
    console.error("❌ Failed to read products.json:", err.message);
    return [];
  }
}

function saveProducts(products) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(products, null, 2));
  } catch (err) {
    console.error("❌ Failed to save products.json:", err.message);
  }
}

/* ================= ADMIN AUTH ================= */
const ADMIN_USER = "admin";
const ADMIN_PASSWORD = "admin123";

/* ================= AUTH ROUTES ================= */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

function requireLogin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect("/login.html");
}

/* ================= BASIC ROUTES ================= */
app.get("/", (req, res) => {
  res.send("✅ QR Company Server is Running");
});

app.get("/admin.html", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

/* ================= ADMIN APIs ================= */

// Get all products
app.get("/api/products", requireLogin, (req, res) => {
  res.json(loadProducts());
});

// Add / Update product (AUTO SAVE)
app.post("/api/products", requireLogin, (req, res) => {
  const products = loadProducts();

  if (!req.body.id) {
    return res.status(400).json({ error: "Product ID required" });
  }

  const id = req.body.id.trim().toLowerCase();
  const index = products.findIndex(
    p => p.id && p.id.toLowerCase() === id
  );

  if (index >= 0) {
    products[index] = req.body; // update
  } else {
    products.push(req.body); // create
  }

  saveProducts(products);

  res.json({
    success: true,
    productUrl: `/product/${req.body.id}`
  });
});

// Delete product
app.delete("/api/products/:id", requireLogin, (req, res) => {
  const id = req.params.id.toLowerCase();

  const filtered = loadProducts().filter(
    p => p.id && p.id.toLowerCase() !== id
  );

  saveProducts(filtered);
  res.json({ deleted: true });
});

/* ================= PRODUCT PAGE (QR / PUBLIC) ================= */
app.get("/product/:id", (req, res) => {
  const id = req.params.id.toLowerCase();
  const products = loadProducts();

  const product = products.find(
    p => p.id && p.id.toLowerCase() === id
  );

  if (!product) {
    return res.send(`
      <h2 style="font-family:Arial">❌ Product Not Found</h2>
      <p>Invalid Product ID</p>
    `);
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>${product.name || "Product Info"}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial; background:#f4f6f8; padding:20px; }
    .card {
      background:#fff;
      padding:20px;
      border-radius:10px;
      max-width:420px;
      margin:auto;
      box-shadow:0 4px 10px rgba(0,0,0,0.1);
    }
    img { width:100%; border-radius:8px; margin-bottom:15px; }
    h1 { font-size:22px; text-align:center; }
    p { font-size:15px; margin:6px 0; }
    .btn {
      display:block;
      margin-top:15px;
      background:#28a745;
      color:white;
      text-align:center;
      padding:10px;
      border-radius:5px;
      text-decoration:none;
    }
  </style>
</head>
<body>
  <div class="card">

    ${product.image ? `<img src="${product.image}">` : ""}

    <h1>${product.name || "-"}</h1>
    <p><b>Model:</b> ${product.model || "-"}</p>
    <p><b>Power:</b> ${product.power || "-"}</p>
    <p><b>Voltage:</b> ${product.voltage || "-"}</p>
    <p><b>Warranty:</b> ${product.warranty || "-"}</p>
    <p><b>Invoice No:</b> ${product.invoiceNo || "-"}</p>
    <p><b>Invoice Date:</b> ${product.invoiceDate || "-"}</p>
    <p><b>Production Date:</b> ${product.productionDate || "-"}</p>

    ${product.datasheet ? `
      <a class="btn" href="${product.datasheet}" target="_blank">
        📄 Download Datasheet
      </a>` : ""}
  </div>
</body>
</html>
`);
});

/* ================= START SERVER ================= */
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
