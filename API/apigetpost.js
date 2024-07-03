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

    let sql, values;

    sql = 'SELECT * FROM posts';

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
