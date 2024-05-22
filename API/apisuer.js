const express = require("express");
const mysql = require('mysql');
const jwt = require('jsonwebtoken');

const router = express.Router();

const jwtSecretKey = 'pygram';

// Middleware function to verify token
function verifyToken(req, res, next) {
    const token = req.headers['authorization']; // Lấy token từ header Authorization

    if (!token) {
        return res.status(403).json({ error: 'Token is missing' });
    }

    jwt.verify(token.split(' ')[1], jwtSecretKey, (err, decoded) => { // Tách phần token từ tiêu đề Authorization
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
    // Trả về thông tin người dùng từ mã token đã được giải mã
    res.status(200).json({ message: 'Success', user: user });
});

module.exports = router;
