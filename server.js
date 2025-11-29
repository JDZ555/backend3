import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------------------------------------
//  CONEXI�N A MONGODB
// -------------------------------------------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.log("Error MongoDB:", err));

// -------------------------------------------------------
//  MODELOS
// -------------------------------------------------------

const User = mongoose.model("User", new mongoose.Schema({
  username: String,
  password: String,
  telegramId: String,
  state: { type: String, default: "START" },
  tempUsername: String,
  tempPassword: String,
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      qty: Number
    }
  ]
}));

const Product = mongoose.model("Product", new mongoose.Schema({
  name: String,
  brand: String,
  price: Number,
  stock: Number,
  image: String
}));

const Order = mongoose.model("Order", new mongoose.Schema({
  userId: String,
  telegramId: String,
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      qty: Number
    }
  ],
  paymentMethod: String,
  createdAt: { type: Date, default: Date.now }
}));

const Admin = mongoose.model("Admin", new mongoose.Schema({
  username: String,
  password: String
}));

// -------------------------------------------------------
//  RUTAS USUARIO (N8N)
// -------------------------------------------------------

app.get("/user/state", async (req, res) => {
  const { telegramId } = req.query;

  let user = await User.findOne({ telegramId });

  if (!user) {
    user = await User.create({ telegramId });
  }

  res.json({
    ok: true,
    data: {
      userId: user._id,
      state: user.state,
      tempUsername: user.tempUsername,
      tempPassword: user.tempPassword,
      cart: user.cart
    }
  });
});

app.post("/user/state", async (req, res) => {
  const { telegramId, state, tempUsername, tempPassword } = req.body;

  const user = await User.findOneAndUpdate(
    { telegramId },
    { state, tempUsername, tempPassword },
    { new: true }
  );

  res.json({ ok: true, msg: "Estado actualizado", data: user });
});

// -------------------------------------------------------
//  REGISTRO / LOGIN
// -------------------------------------------------------

app.post("/register", async (req, res) => {
  const { username, password, telegramId } = req.body;

  const userExist = await User.findOne({ username });
  if (userExist) return res.json({ ok: false, msg: "Usuario ya existe" });

  const user = await User.findOneAndUpdate(
    { telegramId },
    { username, password, state: "LOGGED_IN" },
    { new: true }
  );

  res.json({ ok: true, msg: "Usuario registrado", data: user });
});

app.post("/login", async (req, res) => {
  const { username, password, telegramId } = req.body;

  const user = await User.findOne({ username, password });
  if (!user) return res.json({ ok: false, msg: "Credenciales incorrectas" });

  user.telegramId = telegramId;
  user.state = "LOGGED_IN";
  await user.save();

  res.json({ ok: true, msg: "Login exitoso", data: user });
});

// -------------------------------------------------------
//  PRODUCTOS (API P�BLICA)
// -------------------------------------------------------

app.get("/products", async (req, res) => {
  const products = await Product.find();
  res.json({ ok: true, data: products });
});

// -------------------------------------------------------
//  CARRITO
// -------------------------------------------------------

app.post("/cart/add", async (req, res) => {
  const { telegramId, productId } = req.body;

  const user = await User.findOne({ telegramId });
  if (!user) return res.json({ ok: false, msg: "Usuario no encontrado" });

  user.cart.push({
    productId: new mongoose.Types.ObjectId(productId),
    qty: 1
  });

  await user.save();

  res.json({ ok: true, msg: "Producto a�adido", data: user.cart });
});

app.get("/cart", async (req, res) => {
  const { telegramId } = req.query;

  const user = await User.findOne({ telegramId }).populate("cart.productId");
  if (!user) return res.json({ ok: false, msg: "Usuario no existe" });

  res.json({ ok: true, data: user.cart });
});

// -------------------------------------------------------
//  �RDENES
// -------------------------------------------------------

app.post("/order", async (req, res) => {
  const { telegramId, paymentMethod } = req.body;

  const user = await User.findOne({ telegramId }).populate("cart.productId");
  if (!user) return res.json({ ok: false, msg: "Usuario no encontrado" });

  await Order.create({
    userId: user._id,
    telegramId,
    paymentMethod,
    products: user.cart
  });

  user.cart = [];
  user.state = "START";
  await user.save();

  res.json({ ok: true, msg: "Compra registrada" });
});

// -------------------------------------------------------
//  ADMIN LOGIN
// -------------------------------------------------------

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username, password });
  if (!admin) return res.json({ ok: false, msg: "Credenciales incorrectas" });

  res.json({ ok: true, msg: "Login admin correcto" });
});

// -------------------------------------------------------
//  ADMIN REGISTER
// -------------------------------------------------------

app.post("/admin/register", async (req, res) => {
  const { username, password } = req.body;

  const adminExists = await Admin.findOne({ username });
  if (adminExists) return res.json({ ok: false, msg: "Administrador ya existe" });

  await Admin.create({ username, password });

  res.json({ ok: true, msg: "Administrador creado" });
});

// -------------------------------------------------------
//  ADMIN PRODUCT CRUD
// -------------------------------------------------------

app.post("/admin/products", async (req, res) => {
  const product = await Product.create(req.body);
  res.json({ ok: true, data: product });
});

app.put("/admin/products/:id", async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ ok: true, data: product });
});

app.delete("/admin/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true, msg: "Producto eliminado" });
});

// -------------------------------------------------------
//  ADMIN -> VER �RDENES
// -------------------------------------------------------

app.get("/admin/orders", async (req, res) => {
  const orders = await Order.find().populate("products.productId");
  res.json({ ok: true, data: orders });
});

// -------------------------------------------------------
//  SERVIDOR
// -------------------------------------------------------

const PORT = process.env.PORT ?? 4000;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Backend funcionando en http://localhost:${PORT}`)
);
