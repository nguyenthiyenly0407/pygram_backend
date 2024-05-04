const express = require("express");
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Thêm thư viện jsonwebtoken

const router = express.Router();
router.use(cors());
router.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234567", 
    database: "signup"
});

const jwtSecretKey = 'pygram'; // Thay thế 'your_secret_key' bằng một giá trị bí mật thực sự

router.post('/', (req, res) => {
    const { email, password, major } = req.body;
    let tableName = '';

    if (major === 'Student') {
        tableName = 'students';
    } else if (major === 'Teacher') {
        tableName = 'teachers';jdhsdahsdlkjshlkdasblksadlksabsaldasbfsadnsalksandsaz,xz,
    } else {
        return res.status(400).json({ error: 'Invalid major' });
    }

    const sql = `SELECT id, name, major FROM ${tableName} WHERE email=? AND password=? AND major=?`;
    db.query(sql, [email, password, major], (err, data) => {
        if (err) {
            console.error('Error querying database: ' + err.stack);
            return res.status(500).json({ error: 'Error querying database' });
        }
        if (data.length > 0) {
            console.log('User found in database');
            const user = data[0];
            const token = jwt.sign({ id:user.id, name: user.name, major: major }, jwtSecretKey);
            res.status(200).json({ message: 'Success', token: token ,userId: user.id, userName:user.name }); // Trả về token cùng với thông tin người dùng
        } else {
            console.log('User not found in database');
            return res.status(401).json({ error: 'Invalid email or password' });
        }
    });
});

module.exports = router;
