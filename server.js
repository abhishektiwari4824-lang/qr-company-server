const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const multer = require("multer");

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ❌ BLOCK direct admin.html access */
app.get("/admin.html", (req, res) => {
  return res.status(404).send("Not Found");
});

app.use(express.static("public"));

app.use(
  session({
    secret: "qr-admin-secret",
    resave: false,
    saveUninitialized: false
  })
);

/* ---------- DATABASE ---------- */
const DATA_FILE = path.join(__dirname, "products.json");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

/* ---------- AUTH ---------- */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
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
  if (req.session.admin) next();
  else res.redirect("/login.html");
}

/* ✅ PROTECTED ADMIN ROUTE */
app.get("/admin", isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

/* ---------- START SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server running on port " + PORT);
});
