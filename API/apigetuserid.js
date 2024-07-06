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

router.get('/', async (req, res) => {
    try {
        const userId = req.query.userId; // Đổi từ req.params sang req.query
        let tableName = '';

        if (userId.startsWith('215')) {
            tableName = 'students';
        } else if (userId.startsWith('115')) {
            tableName = 'teachers';
        } else {
            return res.status(400).json({ error: 'Invalid userId' });
        }

        // Thêm dấu cách và chỉnh tên cột name thành fullName trong câu truy vấn
        const [users] = await db.query(`SELECT id, name, major FROM ${tableName} WHERE id != ?`, [userId]);
        
        // Trả về JSON với email, fullName, và receiverId thay vì id, name, và major
        res.status(200).json(users.map(user => ({ email: user.email, name: user.name, receiverId: user.id })));
    } catch (error) {
        console.error('Error', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;
