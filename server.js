// นำเข้าไลบรารี
const jsonServer = require('json-server');
const cors = require('cors');
const server = jsonServer.create();
const router = jsonServer.router('db.json');  // เส้นทางไปยังไฟล์ db.json
const middlewares = jsonServer.defaults();

// เปิดใช้งาน CORS
server.use(cors());

// ใช้ middlewares ของ json-server (เช่น logs, static files, etc.)
server.use(middlewares);

// ใช้ router ที่กำหนดใน db.json
server.use(router);

// เริ่มเซิร์ฟเวอร์ที่พอร์ต 3000
server.listen(3000, () => {
  console.log('JSON Server is running at http://localhost:3000');
});
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;  // ✅ แก้ให้รองรับ PORT ของ Render

app.use(express.json()); // Middleware สำหรับ JSON

app.get("/", (req, res) => {
    res.send("Server is running!");
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});