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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      
    }
  });

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234567", 
    database: "signup",
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
    socket.on('addUser', userId => {
        const isUserExist = users.find(user => user.userId === userId);
        if (!isUserExist) {
            const user = { userId, socketId: socket.id };
            users.push(user);
            io.emit('getUsers', users);
        }
    });

    socket.on('sendMessage', async ({ senderId, receiverId, message, conversationId }) => {
        const receiver = users.find(user => user.userId === receiverId);
        const sender = users.find(user => user.userId === senderId);
        const [user] = await db.query('SELECT id, fullName, email FROM Users WHERE id = ?', [senderId]);
        if (receiver) {
            io.to(receiver.socketId).to(sender.socketId).emit('getMessage', {
                senderId,
                message,
                conversationId,
                receiverId,
                user: user[0]
            });
        } else {
            io.to(sender.socketId).emit('getMessage', {
                senderId,
                message,
                conversationId,
                receiverId,
                user: user[0]
            });
        }
    });

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
        const userId = req.params.userId;
        console.log('Fetching conversations for userId:', userId); // Debug log

        const userIdNumber = parseInt(userId); // Convert userId to number
        console.log('Formatted userIdNumber for JSON_EXTRACT:', userIdNumber);

        // Thực hiện truy vấn SQL để lấy các conversation mà userIdNumber có mặt trong members
        const querySql = 'SELECT * FROM Conversations WHERE JSON_CONTAINS(members, ?)';
        const userIdJson = JSON.stringify([userIdNumber]);

        const results = await query(querySql, [userIdJson]);

        console.log('Conversations found:', results); // Debug log

        if (!results || results.length === 0) {
            console.log('No conversations found for userId:', userId);
            return res.status(200).json([]);
        }

        const conversationUserData = await Promise.all(results.map(async (conversation) => {
            try {
                console.log('Parsing members for conversation:', conversation); // Debug log

                const members = Array.isArray(conversation.members) ? conversation.members : JSON.parse(conversation.members);
                console.log('Parsed members:', members); // Debug log

                const receiverId = members.find(member => member !== userIdNumber);
                console.log('Found receiverId:', receiverId); // Debug log

                if (!receiverId) {
                    console.error('No receiverId found in conversation:', conversation); // Debug log
                    return null;
                }

                let user;
                if (String(receiverId).startsWith('215')) { // Convert receiverId to string before checking
                    [user] = await query('SELECT id, name FROM students WHERE id = ?', [receiverId]);
                } else if (String(receiverId).startsWith('115')) { // Convert receiverId to string before checking
                    [user] = await query('SELECT id, name FROM teachers WHERE id = ?', [receiverId]);
                } else {
                    console.error('Invalid receiverId format:', receiverId); // Debug log
                    throw new Error('Invalid receiverId format');
                }

                return { user: user, conversationId: conversation.id };
            } catch (parseError) {
                console.error('Error parsing members:', conversation.members, parseError); // Debug log
                throw parseError;
            }
        }));

        // Filter out null values
        const filteredConversationUserData = conversationUserData.filter(data => data !== null);

        res.status(200).json(filteredConversationUserData);
    } catch (error) {
        console.error('Error', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


app.post('/api/message', async (req, res) => {
    try {
        const { conversationId, senderId, message, receiverId } = req.body;
        if (!senderId || !message) return res.status(400).send('Please fill all required fields');

        if (conversationId === 'new' && receiverId) {
            const [result] = await db.query('INSERT INTO Conversations (members) VALUES (?)', [JSON.stringify([senderId, receiverId])]);
            await db.query('INSERT INTO Messages (conversationId, senderId, message) VALUES (?, ?, ?)', [result.insertId, senderId, message]);
            return res.status(200).send('Message sent successfully');
        } else if (!conversationId && !receiverId) {
            return res.status(400).send('Please fill all required fields');
        }

        await db.query('INSERT INTO Messages (conversationId, senderId, message) VALUES (?, ?, ?)', [conversationId, senderId, message]);
        res.status(200).send('Message sent successfully');
    } catch (error) {
        console.error('Error', error);
        res.status(500).send('Server error');
    }
});

app.get('/api/message/:conversationId', async (req, res) => {
    try {
        const conversationId = req.params.conversationId;

        const checkMessages = async (id) => {
            try {
                const querySql = 'SELECT * FROM Messages WHERE conversationId = ?';
                const results = await query(querySql, [id]);
                
                console.log('Messages found:', results); // Debug log

                if (!results || results.length === 0) {
                    console.log(`No messages found for conversationId ${id}`);
                    return res.status(200).json([]);
                }

                const messageUserData = await Promise.all(results.map(async (message) => {
                    let user;
                    if (String(message.senderId).startsWith('215')) {
                        [user] = await query('SELECT id, name FROM students WHERE id = ?', [message.senderId]);
                    } else if (String(message.senderId).startsWith('115')) {
                        [user] = await query('SELECT id, name FROM teachers WHERE id = ?', [message.senderId]);
                    } else {
                        console.error('Invalid senderId format:', message.senderId); // Debug log
                        throw new Error('Invalid senderId format');
                    }

                    return { user: user, message: message.message };
                }));

                console.log("messageuserdata", messageUserData); // Debug log

                res.status(200).json(messageUserData);
            } catch (error) {
                console.error('Error fetching messages:', error);
                res.status(500).send('Error fetching messages');
            }
        };

        if (conversationId === 'new') {
            const { senderId, receiverId } = req.query;
            if (!senderId || !receiverId) return res.status(400).send('Please provide both senderId and receiverId');
            
            const [conversation] = await db.query('SELECT * FROM Conversations WHERE JSON_CONTAINS(members, ?) AND JSON_CONTAINS(members, ?)', [JSON.stringify(senderId), JSON.stringify(receiverId)]);
            
            if (conversation.length > 0) {
                checkMessages(conversation[0].id);
            } else {
                return res.status(200).json([]);
            }
        } else {
            checkMessages(conversationId);
        }
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


const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});