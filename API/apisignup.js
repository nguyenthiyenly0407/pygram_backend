const express = require("express");
const mysql = require('mysql');
const cors = require('cors');
const bcryptjs = require('bcryptjs');
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

router.post('/', async (req, res) => {
    const { id, name, email, password, birthday, gender, major, grade, tenlop } = req.body;
    if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
        return res.status(400).json({ error: 'Invalid or missing birthday format' });
    }

    let tableName = '';

    if (major === 'Student') {
        tableName = 'students';
    } else if (major === 'Teacher') {
        tableName = 'teachers';
    } else {
        return res.status(400).json({ error: 'Invalid major' });
    }

    try {
        const hashedPassword = await bcryptjs.hash(password, 10);
        const sql = `INSERT INTO ${tableName} (id, name, email, password, birthday, gender, major, grade, tenlop) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [id, name, email, hashedPassword, birthday, gender, major, grade, tenlop];

        db.query(sql, values, (err, data) => {
            if (err) {
                console.error('Error inserting data into database: ' + err.stack);
                return res.status(500).json({ error: 'Error inserting data into database' });
            }
            console.log('Data inserted into database');
            res.status(200).json({ message: 'Data inserted successfully', userId: id });
        });
    } catch (error) {
        console.error('Error processing request: ' + error.stack);
        return res.status(500).json({ error: 'Error processing request' });
    }
});

module.exports = router;
