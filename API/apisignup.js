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

router.post('/', (req, res) => {
    const { id ,name, email, password, day, month, year, gender, major, grade, tenlop } = req.body;

    const birthday = `${year}-${month}-${day}`;

    let tableName = '';

    if (major === 'Student') {
        tableName = 'students';
    } else if (major === 'Teacher') {
        tableName = 'teachers';
    } else {
        return res.status(400).json({ error: 'Invalid major' });
    }

    const sql = `INSERT INTO ${tableName} (id, name, email, password, birthday, gender, major, grade, tenlop) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [id, name, email, password, birthday, gender, major, grade, tenlop];

    db.query(sql, values, (err, data) => {
        if (err) {
            console.error('Error inserting data into database: ' + err.stack);
            return res.status(500).json({ error: 'Error inserting data into database' });
        }
        console.log('Data inserted into database');
        res.status(200).json({ message: 'Data inserted successfully', userId: id });
    });
});

module.exports = router;
