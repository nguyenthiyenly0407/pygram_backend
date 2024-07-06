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
    const { post_id, commenter_id, content } = req.body;

    // Kiểm tra post_id có tồn tại trong bảng posts không
    const checkPostQuery = 'SELECT id FROM posts WHERE id = ?';
    db.query(checkPostQuery, [post_id], (checkPostErr, checkPostResult) => {
        if (checkPostErr) {
            console.error('Error checking post:', checkPostErr);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }

        if (checkPostResult.length === 0) {
            // Nếu không có bài đăng nào với post_id tương ứng, trả về lỗi
            res.status(404).json({ message: 'Post not found' });
            return;
        }

        // Phân biệt người dùng bằng commenter_id
        let sql, values;
        if (commenter_id.startsWith('215')) {
            sql = 'INSERT INTO comments (post_id, student_id, content) VALUES (?, ?,?)';
            values = [post_id, commenter_id, content];
        } else if (commenter_id.startsWith('115')) {
            sql = 'INSERT INTO comments (post_id, teacher_id, content) VALUES (?, ?,?)';
            values = [post_id, commenter_id, content];
        } else {
            res.status(400).json({ message: 'Invalid commenter ID' });
            return;
        }

        // Thực hiện thêm bình luận vào bảng comments
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('Error inserting comment:', err);
                res.status(500).json({ message: 'Internal server error' });
                return;
            }
            res.status(200).json({ message: 'Comment posted successfully' });
        });
    });
});

module.exports = router;
