const express = require("express");
const mysql = require('mysql');
const cors = require('cors');
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

const jwtSecretKey = 'pygram';

// Middleware function to verify token
function verifyToken(req, res, next) {
    const token = req.headers['authorization']; // Lấy token từ header Authorization

    if (!token) {
        return res.status(403).json({ error: 'Token is missing' });
    }

    jwt.verify(token, jwtSecretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
}

// Route to get user information
router.get('/', verifyToken, (req, res) => {
    const user = req.user;
    const userId = user.id; 
    res.status(200).json({ message: 'Success', user: user, userId:userId });
    console.log("userId",userId)
});

module.exports = router;
