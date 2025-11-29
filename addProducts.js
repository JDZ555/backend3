import mongoose from "mongoose";
import "dotenv/config";

const Product = mongoose.model("Product", new mongoose.Schema({
  name: String,
  brand: String,
  price: Number,
  stock: Number,
  image: String
}));

const products = [
  {
    name: "iPhone 14 Pro Max",
    brand: "Apple",
    price: 5400000,
    stock: 5,
    image: "https://example.com/iphone14promax.jpg"
  },
  {
    name: "Samsung Galaxy S23 Ultra",
    brand: "Samsung",
    price: 4800000,
    stock: 8,
    image: "https://example.com/s23ultra.jpg"
  },
  {
    name: "Xiaomi 13 Pro",
    brand: "Xiaomi",
    price: 3200000,
    stock: 10,
    image: "https://example.com/xiaomi13pro.jpg"
  }
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Conectado a MongoDB…");

    await Product.insertMany(products);

    console.log("Productos insertados con éxito.");
    process.exit(0);
  })
  .catch(err => {
    console.log("Error:", err);
    process.exit(1);
  });
