const express = require("express");
const mysql = require('mysql');
const cors = require('cors');
const router = express.Router();
router.use(cors());
router.use(express.json());


const db = mysql.createConnection({
    host: "sql12.freemysqlhosting.net",
    user: "sql12718292",
    password: "GL96MlnVSs", 
    database: "sql12718292",
    multipleStatements: true
});

router.post('/', (req, res) => {
    const { poster_id, content } = req.body;

    let sql, values;

    // Phân biệt người dùng bằng poster_id
    if (poster_id.startsWith('215')) {
        sql = 'INSERT INTO posts (student_id, content) VALUES (?, ?)';
        values = [poster_id, content];
    } else if (poster_id.startsWith('115')) {
        sql = 'INSERT INTO posts (teacher_id, content) VALUES (?, ?)';
        values = [poster_id, content];
    } else {
        res.status(400).json({ message: 'Invalid poster ID' });
        return;
    }

    // Thực hiện thêm bài đăng vào bảng posts
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting post:', err);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }

        // Sau khi thêm bài đăng thành công, truy vấn cơ sở dữ liệu để lấy id của bài đăng mới
        const postId = result.insertId;

        // Trả về id của bài đăng mới cho client
        res.status(200).json({ message: 'Post successfully posted', postId });
    });
});

module.exports = router;