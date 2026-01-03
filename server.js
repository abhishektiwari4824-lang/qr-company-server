const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ================= SESSION ================= */
app.use(
  session({
    name: "qr-company-session",
    secret: process.env.SESSION_SECRET || "qr-company-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Render uses HTTPS automatically
      maxAge: 1000 * 60 * 60 // 1 hour
    }
  })
);

/* ================= DATABASE ================= */
const dataFile = path.join(__dirname, "products.json");

function loadProducts() {
  if (!fs.existsSync(dataFile)) return [];
  return JSON.parse(fs.readFileSync(dataFile, "utf-8"));
}

function saveProducts(products) {
  fs.writeFileSync(dataFile, JSON.stringify(products, null, 2));
}

/* ================= AUTH CONFIG ================= */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

/* ================= AUTH ROUTES ================= */

// Login
app.post("/login", (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.sendStatus(200);
  }
  res.sendStatus(401);
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

// Auth middleware
function requireLogin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect("/login.html");
}

/* ================= ROUTES ================= */

// Home
app.get("/", (req, res) => {
  res.send("QR Company Server is Running ✅");
});

// Protected Admin Page
app.get("/admin.html", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

/* ================= CUSTOMER QR PAGE ================= */
app.get("/product/:id", (req, res) => {
  const products = loadProducts();
  const product = products.find(p => p.id === req.params.id);

  if (!product) {
    return res.send("❌ Product Not Found");
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>${product.name}</title>
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

    ${product.image ? `<img src="${product.image}" alt="Product Image">` : ""}

    <h1>${product.name}</h1>
    <p><b>Power:</b> ${product.power}</p>
    <p><b>Voltage:</b> ${product.voltage}</p>
    <p><b>Lumens:</b> ${product.lumens || "—"}</p>
    <p><b>Color:</b> ${product.color || "—"}</p>
    <p><b>Warranty:</b> ${product.warranty}</p>
    <p><b>Price:</b> ${product.price || "—"}</p>

    ${product.datasheet ? `
      <a class="btn" href="${product.datasheet}" target="_blank">
        📄 Download Datasheet
      </a>` : ""}

  </div>
</body>
</html>
  `);
});

/* ================= ADMIN SAVE ================= */
app.post("/admin/save", requireLogin, (req, res) => {
  const products = loadProducts();
  const index = products.findIndex(p => p.id === req.body.id);

  if (index >= 0) {
    products[index] = req.body;
  } else {
    products.push(req.body);
  }

  saveProducts(products);
  res.json({ status: "ok" });
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
