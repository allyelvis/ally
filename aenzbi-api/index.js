const express = require('express');
const app = express();
app.use(express.json());

// Sample product, order, and accounting data
let products = [];
let orders = [];
let accounting = [];

// Add new product
app.post('/products', (req, res) => {
  const product = req.body;
  products.push(product);
  res.send({ message: 'Product added', product });
});

// List all products
app.get('/products', (req, res) => {
  res.send(products);
});

// Add new order
app.post('/orders', (req, res) => {
  const order = req.body;
  orders.push(order);
  res.send({ message: 'Order placed', order });
});

// List all orders
app.get('/orders', (req, res) => {
  res.send(orders);
});

// Manage accounting data
app.post('/accounting', (req, res) => {
  const entry = req.body;
  accounting.push

(entry);
  res.send({ message: 'Accounting entry added', entry });
});

// List all accounting entries
app.get('/accounting', (req, res) => {
  res.send(accounting);
});

// Start the server
app.listen(3001, () => {
  console.log('Aenzbi ERP E-commerce API is running on port 3001');
});
