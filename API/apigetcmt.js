const express = require("express");
const mysql = require('mysql');
const cors = require('cors');
const { globalPostId } = require('./apipost'); // Đường dẫn tới apipost.js
const router = express.Router();
router.use(cors());
router.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234567", 
    database: "signup"
});

router.get('/', (req, res) => {
    // Sử dụng globalPostId ở đây
    

    // Thay đổi câu truy vấn SQL để sử dụng globalPostId thay vì LIMIT 1
    const sql = `SELECT id, content FROM comments`;
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error getting posts:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'No posts found' });
        }
        res.status(200).json({ posts: result });
    });
});

module.exports = router;
