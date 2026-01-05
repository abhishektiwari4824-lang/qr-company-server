const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const multer = require("multer");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.use(
  session({
    secret: "qr-admin-secret",
    resave: false,
    saveUninitialized: false
  })
);

const DATA_FILE = path.join(__dirname, "products.json");

/* ---------- FILE STORAGE ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "image") cb(null, "public/images");
    else cb(null, "public/datasheets");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* ---------- AUTH ---------- */
app.post("/login", (req, res) => {
  if (req.body.username === "admin" && req.body.password === "admin123") {
    req.session.admin = true;
    res.sendStatus(200);
  } else {
    res.sendStatus(401);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

function isAdmin(req, res, next) {
  req.session.admin ? next() : res.sendStatus(403);
}

/* ---------- CREATE PRODUCT ---------- */
app.post(
  "/api/products",
  isAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "datasheet", maxCount: 1 }
  ]),
  (req, res) => {
    const products = JSON.parse(fs.readFileSync(DATA_FILE));

    const product = {
      ...req.body,
      image: req.files.image
        ? "/images/" + req.files.image[0].filename
        : "",
      datasheet: req.files.datasheet
        ? "/datasheets/" + req.files.datasheet[0].filename
        : ""
    };

    products.push(product);
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
    res.sendStatus(200);
  }
);

/* ---------- GET ALL PRODUCTS ---------- */
app.get("/api/products", isAdmin, (req, res) => {
  res.json(JSON.parse(fs.readFileSync(DATA_FILE)));
});

/* ---------- DELETE PRODUCT ---------- */
app.delete("/api/products/:id", isAdmin, (req, res) => {
  const products = JSON.parse(fs.readFileSync(DATA_FILE));

  const updatedProducts = products.filter(
    p => p.id !== req.params.id
  );

  if (updatedProducts.length === products.length) {
    return res.status(404).send("Product not found");
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(updatedProducts, null, 2));
  res.sendStatus(200);
});

/* ---------- PUBLIC PRODUCT PAGE ---------- */
app.get("/product/:id", (req, res) => {
  const products = JSON.parse(fs.readFileSync(DATA_FILE));
  const product = products.find(p => p.id === req.params.id);

  if (!product) return res.status(404).send("Product not found");

  let html = fs.readFileSync(
    path.join(__dirname, "public", "product.html"),
    "utf-8"
  );

  html = html.replace(
    "const product = PRODUCT_DATA;",
    `const product = ${JSON.stringify(product)};`
  );

  res.send(html);
});

/* ---------- START SERVER ---------- */
app.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});
