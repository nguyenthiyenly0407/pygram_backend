// Import các module cần thiết
const express = require("express");
const mysql = require('mysql');
const cors = require('cors');
const router = express.Router();
router.use(cors());
router.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234567", 
    database: "signup"
})

router.get('/', (req, res) => {
  const searchText = req.query.query;

  // Truy vấn cơ sở dữ liệu để tìm kiếm người dùng chính xác
  const queryString = `
    SELECT id, name FROM students WHERE name = '${searchText}'
    UNION ALL
    SELECT id, name FROM teachers WHERE name = '${searchText}';
  `;

  db.query(queryString, (error, results, fields) => {
    if (error) {
      console.error('Error performing search:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
    // Trả về kết quả tìm kiếm
    res.json({ results });
  });
});

module.exports = router;
