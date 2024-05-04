const express = require("express");
const mysql = require('mysql');
const cors = require('cors');

const router = express.Router();
router.use(cors());
router.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "", 
    database: "signup"
});

router.post('/',(req,res)=>{
    const { id, major, imageurl } = req.body;
    
    if (!id || !imageurl || !major) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    
    let tableName = '';
    
    if (major === 'Student') {
        tableName = 'students';
    } else if (major === 'Teacher') {
        tableName = 'teachers';
    } else {
        return res.status(400).json({ error: 'Invalid major' });
    }

    const sql = `UPDATE ${tableName} SET imageurl = ? WHERE id = ?`;

    db.query(sql, [imageurl, id], (error, result) => {
        if (error) {
            console.error("Error updating image URL:", error);
            return res.status(500).json({ message: "Internal server error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        return res.status(200).json({ message: "Image URL updated successfully." });
    });
});

module.exports = router;
