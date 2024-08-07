const express = require("express");
const mysql = require('mysql');
const cors = require('cors');
const { globalPostId } = require('./apipost'); // Đường dẫn tới apipost.js
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

router.get('/', (req, res) => {
    // Sử dụng globalPostId ở đây


    // Thay đổi câu truy vấn SQL để sử dụng globalPostId thay vì LIMIT 1
    const sql = `
  SELECT
    post_id,
    CONCAT(
        '[',
        GROUP_CONCAT(
            CONCAT(
                '{"id":', comments.id,
                ',"content":"', REPLACE(IFNULL(content, ''), '"', '\"'), '"',
                ',"student_id":', IFNULL(comments.student_id, 'null'),
                ',"student_name":"', IFNULL(REPLACE(s.name, '"', '\"'), ''), '"',
                ',"teacher_id":', IFNULL(comments.teacher_id, 'null'),
                ',"teacher_name":"', IFNULL(REPLACE(t.name, '"', '\"'), '"')
            , '}')
        SEPARATOR ','
        ),
        ']'
    ) AS comments
FROM
    comments
LEFT JOIN
    students s
ON
    s.id = comments.student_id
LEFT JOIN
    teachers t
ON
    t.id = comments.teacher_id
GROUP BY
    post_id;


    `;
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error getting posts:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'No posts found' });
        }
        console.log(result);
        res.status(200).json(result.map(item => {
            return {
                ...item,
                comments: JSON.parse(item.comments)
            }
        }));
    });
});

module.exports = router;
