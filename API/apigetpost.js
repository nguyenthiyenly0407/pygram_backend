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
});

router.get('/', (req, res) => {
    const { id, poster_id, content } = req.query; 

    if (!id || !poster_id || !content) {
        return res.status(400).json({ message: 'Missing parameters' });
    }

    let sql, values;

    // Phân biệt người dùng bằng poster_id
    if (poster_id.startsWith('215')) {
        sql = 'SELECT * FROM posts WHERE id = ? AND student_id = ? AND content = ?';
        values = [id, poster_id, content];
    } else if (poster_id.startsWith('115')) {
        sql = 'SELECT * FROM posts WHERE id = ? AND teacher_id = ? AND content = ?';
        values = [id, poster_id, content];
    } else {
        return res.status(400).json({ message: 'Invalid commenter ID' });
    }

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error getting posts:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'No posts found' });
        }
        console.log("posts:",result);
        res.status(200).json({ message: 'Success', posts: result });
    });
});


module.exports = router;
