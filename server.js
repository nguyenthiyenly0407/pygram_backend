const express = require("express");
const mysql = require('mysql');
const app = express();
const cors = require('cors');
const http = require('http');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcryptjs = require('bcryptjs');
const { Server } = require("socket.io");
const util = require('util')
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const { parse } = require('json2csv');
const ExcelJS = require('exceljs');
app.use(bodyParser.json());
app.use(cors({
   origin: 'https://pygram-5c526.web.app/'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const server = http.createServer(app);
const usersLogin = [];
const io = new Server(server, {
    cors: {
      origin: "*",
      
    }
  });

const db = mysql.createConnection({
    host: "sql12.freemysqlhosting.net",
    user: "sql12718292",
    password: "GL96MlnVSs", 
    database: "sql12718292",
    multipleStatements: true
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database: ' + err.stack);
        return;
    }
    console.log('Connected to database');
});

// Đưa tất cả các tuyến đường API vào Express app
const apisignupRouter = require("./API/apisignup");
const apisigninrouter = require("./API/apilogin");
const apiuserrouter = require("./API/apisuer");
const apipostrouter = require("./API/apipost");
const apigetpostrouter = require("./API/apigetpost");
const apicmtstrouter = require("./API/apicmtst")
const apigetcmtrouter = require("./API/apigetcmt")
const apisearchrouter = require("./API/apisearch");
const { error } = require("console");

app.use('/api/signup', apisignupRouter);
app.use('/api/login', apisigninrouter);
//app.use('/api/user', apiuserrouter);
app.use('/api/user/:userId', apiuserrouter);
app.use('/api/poststatus',apipostrouter);
app.use('/api/getpoststatus', apigetpostrouter);
app.use('/api/cmtstudent',apicmtstrouter);
app.use('/api/getcmt',apigetcmtrouter)
app.use('/api/search',apisearchrouter)

// Xử lý kết nối của socket.io
let users = [];
io.on('connection', socket => {
    console.log('User connected', socket.id);

    socket.on('joinRoom', async(data) => {
        socket.join(data.room);
    })
    socket.on('sendMessage', async (data) => {
        io.emit('newMessage', data);
    });
    socket.on('login',async (data) => {
        for(let item of usersLogin) {
            if(item.id === data.id) {
                io.emit('newLogin', {newLogin: data,usersLogin});
                return ;
            }
        }
        usersLogin.push(data);
        io.emit('newLogin', {newLogin: data,usersLogin});
    })
    socket.on('logout', async (data) => {
        usersLogin = usersLogin.filter(item => item.id !== data.id)
        console.log(usersLogin);
        io.emit('newLogout', {newLogout: data, usersLogin});
    })

    socket.on('disconnect', () => {
        users = users.filter(user => user.socketId !== socket.id);
        io.emit('getUsers', users);
    });

});
app.post('/api/conversation', async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        const members = [parseInt(senderId), parseInt(receiverId)]; 
        await db.query('INSERT INTO Conversations (members) VALUES (?)', [[JSON.stringify(members)]]);
        res.status(200).send('Conversation created successfully');
    } catch (error) {
        console.error('Error', error);
        res.status(500).send('Server error');
    }
});

const query = util.promisify(db.query).bind(db);

app.get('/api/conversations/:userId', async (req, res) => {
    try {
        let data = [];
        const userId = req.params.userId;
        console.log('Fetching conversations for userId:', userId); // Debug log

        const userIdNumber = parseInt(userId); // Convert userId to number
        console.log('Formatted userIdNumber for JSON_EXTRACT:', userIdNumber);

        const querySql = 'SELECT * FROM students WHERE id != ?';
        const queryTHSql = 'SELECT * FROM teachers WHERE id != ?';

        const results = await query(querySql, [userId]);
        data = results.map((item) => {
            return {
                conversationId: `${item.id}_${userId}`,
                name: item.name,
                gender: item.gender
            }
        })
        const resultsTH = await query(queryTHSql, [userId]);
        data.push(
            ...resultsTH.map(item => {
                return {
                    conversationId: `${item.id}_${userId}`,
                name: item.name,
                gender: item.gender
                }
            })
        )

        if (!results || results.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


app.post('/api/message', async (req, res) => {
    try {
        const { conversationId, senderId, message } = req.body;
        const fenId = conversationId.split("_")[0];

        if (!senderId || !message) return res.status(400).send('Please fill all required fields');

        if (conversationId) {
            await db.query('INSERT INTO Messages (conversationId, senderId, message, createdAt) VALUES (?, ?, ?,?)', [conversationId, senderId, message,new Date()]);
            await db.query('INSERT INTO Messages (conversationId, senderId, message, createdAt) VALUES (?, ?, ?,?)', [`${senderId}_${fenId}`, senderId, message,new Date()]);
            return res.status(200).send('Message sent successfully');
        } else if (!conversationId) {
            return res.status(400).send('Please fill all required fields');
        }
        res.status(200).send('Message sent successfully');
    } catch (error) {
        console.error('Error', error);
        res.status(500).send('Server error');
    }
});

app.get('/api/message/:conversationId', async (req, res) => {
    try {
        const conversationId = req.params.conversationId;
        const userId = conversationId.split('_')[1];
        let data = [];
        const querySql = 'SELECT * FROM Messages WHERE conversationId = ?';

        const results = await query(querySql, [conversationId]);
        data = results.map((item) => {
            return {
                id: item.id,
                conversationId: item.conversationId,
                isUser: item.senderId === userId,
                message: item.message,
                time: item.createdAt
            }
        })

        if (!results || results.length === 0) {
            console.log('No conversations found for userId:', userId);
            return res.status(200).json([]);
        }
        res.status(200).json(data);
        
            
    } catch (error) {
        console.error('Error', error);
        res.status(500).send('Server error');
    }
});

app.get('/api/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        let users;

        if (String(userId).startsWith('215')) {
            [users] = await query('SELECT id, name FROM students WHERE id = ?', [userId]);
        } else if (String(userId).startsWith('115')) {
            [users] = await query('SELECT id, name FROM teachers WHERE id = ?', [userId]);
        } else {
            console.error('Invalid userId format:', userId); // Debug log
            throw new Error('Invalid userId format');
        }
        
        if (!users) {
            throw new Error('No users found');
        }

        // Ensure users is an array
        if (!Array.isArray(users)) {
            users = [users]; // Convert to array with single element
        }

        // Mapping the response to match the expected output
        const mappedUsers = users.map(user => ({ name: user.name, receiverId: user.id }));
        res.status(200).json(mappedUsers);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(404).send('No users found'); // Adjust status code and message as appropriate
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        // Keep the original filename
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No files were uploaded.');
    }

    const filePath = `${req.file.originalname}`;

    const query = 'INSERT INTO uploaded_files (file_path) VALUES (?)';
    db.query(query, [filePath], (error, results) => {
        if (error) {
            console.error('Error saving file path to database:', error);
            return res.status(500).send('Error saving file path to database');
        }
        res.json({ filePath });
    });
});

app.get('/files', (req, res) => {
    const query = 'SELECT * FROM uploaded_files';
    db.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching uploaded files:', error);
            return res.status(500).send('Error fetching uploaded files');
        }

        const files = results.map(file => ({ url: file.file_path }));
        res.json(files);
    });
});
app.delete('/delete/:filename', (req, res) => {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(__dirname, 'temp', filename);

    // Xóa file từ thư mục tạm
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).send('Error deleting file');
        }

        // Xóa đường dẫn file từ cơ sở dữ liệu
        const query = 'DELETE FROM uploaded_files WHERE file_path = ?';
        db.query(query, [`${filename}`], (error, results) => {
            if (error) {
                console.error('Error deleting file path from database:', error);
                return res.status(500).send('Error deleting file path from database');
            }
            res.send('File deleted successfully');
        });
    });
});
app.get('/download/:filename', (req, res) => {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(__dirname, 'temp', filename);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }

    // Set appropriate headers
    const mimeType = getMimeType(filePath);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case '.pdf':
            return 'application/pdf';
        case '.pptx':
            return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        default:
            return 'application/octet-stream';
    }
}
app.use('/uploads', express.static(path.join(__dirname, 'temp')));
app.use('/files', express.static(path.join(__dirname, 'temp')));
app.use('delete/:filename',express.static(path.join(__dirname, 'temp')))
// API to add a new quiz with questions and options
app.post('/quizzes', async (req, res) => {
    try {
        const { title, questions } = req.body;
        const link = uuidv4(); // Generate a unique link for the quiz

        // Insert the quiz
        const quizResult = await query('INSERT INTO quizzes (title, link) VALUES (?, ?)', [title, link]);
        const quizId = quizResult.insertId;

        // Insert each question and its options
        for (let q of questions) {
            const questionResult = await query('INSERT INTO questions (quiz_id, question, correct_answer) VALUES (?, ?, ?)', [quizId, q.question, q.correctAnswer]);
            const questionId = questionResult.insertId;

            for (let option of q.options) {
                await query('INSERT INTO options (question_id, option_text) VALUES (?, ?)', [questionId, option]);
            }
        }

        res.json({ message: 'Quiz added!', link: link });
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

// API to get a quiz by its unique link (without correct answers)
app.get('/quizzes', async (req, res) => {
    try {
        const quizzes = await query('SELECT id, title, link FROM quizzes');
        res.json(quizzes);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

app.get('/quizzes/:link', async (req, res) => {
    try {
        const { link } = req.params;

        // Get the quiz by link
        const quizResults = await query('SELECT id, title, link FROM quizzes WHERE link = ?', [link]);
        if (quizResults.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        const quiz = quizResults[0];

        // Get questions and options for the quiz
        const questionsResults = await query('SELECT id, question FROM questions WHERE quiz_id = ?', [quiz.id]);
        for (let question of questionsResults) {
            const optionsResults = await query('SELECT id, option_text FROM options WHERE question_id = ?', [question.id]);
            question.options = optionsResults;
        }
        quiz.questions = questionsResults;

        res.json(quiz);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});
app.post('/submitquiz', (req, res) => {
    const { userId, quizId, answers } = req.body;

    // Fetch correct answers from the database
    const query = `
        SELECT id, correct_answer
        FROM questions
        WHERE quiz_id = ?
    `;
    db.query(query, [quizId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        let correctAnswersCount = 0;
        results.forEach(question => {
            if (answers[question.id] === question.correct_answer) {
                correctAnswersCount++;
            }
        });

        const totalQuestions = results.length;
        const score = correctAnswersCount;

        // Store the score in the database
        const insertScoreQuery = `
            INSERT INTO scores (student_id, quiz_id, answers, score, total_questions)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.query(insertScoreQuery, [userId, quizId, JSON.stringify(answers), score, totalQuestions], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({userId, score, totalQuestions });
        });
    });
});
app.get('/downloadscores/:quizId', async (req, res) => {
    const { quizId } = req.params;
  
    db.query('SELECT student_id, score, total_questions FROM scores WHERE quiz_id = ?', [quizId], async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error querying the database' });
      }
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scores');
  
      worksheet.columns = [
        { header: 'Student ID', key: 'student_id', width: 15 },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'Total Questions', key: 'total_questions', width: 15 },
      ];
  
      results.forEach(result => {
        worksheet.addRow(result);
      });
  
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=scores.xlsx');
  
      await workbook.xlsx.write(res);
      res.end();
    });
  });
  
  app.get('/api/setting/:id', (req, res) => {
    const userId = req.params.id;
    const isTeacher = userId.startsWith('115');
  
    let query;
    if (isTeacher) {
      query = 'SELECT * FROM teachers WHERE id = ?';
    } else {
      query = 'SELECT * FROM students WHERE id = ?';
    }
  
    db.query(query, [userId], (err, result) => {
      if (err) {
        console.error('Error fetching user information:', err);
        return res.status(500).json({ message: 'Error fetching user information' });
      }
  
      if (result.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const user = result[0];
      res.json({ message: 'Success', user });
    });
  });
  
  app.put('/api/update', (req, res) => {
    const { id, name, email, birthday, gender, major } = req.body;
  
    // Kiểm tra xem id có bắt đầu bằng 115 hay 215
    if (id.startsWith('115')) {
      // Cập nhật bảng teachers
      db.query(
        'UPDATE teachers SET name = ?, email = ?, birthday = ?, gender = ?, major = ? WHERE id = ?',
        [name, email, birthday, gender, major, id],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Lỗi khi cập nhật thông tin' });
          }
          return res.json({ message: 'Cập nhật thông tin thành công' });
        }
      );
    } else if (id.startsWith('215')) {
      // Cập nhật bảng students
      db.query(
        'UPDATE students SET name = ?, email = ?, birthday = ?, gender = ?, major = ? WHERE id = ?',
        [name, email, birthday, gender, major, id],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Lỗi khi cập nhật thông tin' });
          }
          return res.json({ message: 'Cập nhật thông tin thành công' });
        }
      );
    } else {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }
  });


  const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server is listening on port ${port}`)});