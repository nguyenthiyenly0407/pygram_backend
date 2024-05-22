const express = require("express");
const mysql = require('mysql');
const cors = require('cors');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
router.use(cors());
router.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234567",
    database: "signup"
});

router.post('/', async (req, res) => {
    const { email, password, major } = req.body;
    let tableName = '';

    if (major === 'Student') {
        tableName = 'students';
    } else if (major === 'Teacher') {
        tableName = 'teachers';
    } else {
        return res.status(400).json({ error: 'Invalid major' });
    }

    try {
        const query = `SELECT id, name, major, password FROM ${tableName} WHERE email = ?`;
        db.query(query, [email], async (err, results) => {
            if (err) {
                console.error('Error executing query:', err.stack);
                return res.status(500).json({ error: 'Error executing query' });
            }

            if (results.length === 0) {
                return res.status(400).json({ error: 'User email or password is incorrect' });
            }

            const user = results[0];
            console.log('Found user:', user);

            const validPassword = await bcryptjs.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'User email or password is incorrect' });
            }

            const payload = { userId: user.id, email: email };
            const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'THIS_IS_A_JWT_SECRET_KEY';
            const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: '1d' });

            const updateQuery = `UPDATE ${tableName} SET token = ? WHERE id = ?`;
            db.query(updateQuery, [token, user.id], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating token:', updateErr.stack);
                    return res.status(500).json({ error: 'Error updating token' });
                }
                res.status(200).json({ user: { id: user.id, email: email, name: user.name }, token });
            });
        });
    } catch (error) {
        console.error('Error processing request:', error.stack);
        res.status(500).json({ error: 'Error processing request' });
    }
});

module.exports = router;