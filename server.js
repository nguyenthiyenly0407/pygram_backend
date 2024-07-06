const express = require("express");
const mysql = require('mysql');
const app = express();
const cors = require('cors');
const http = require('http');
const bcryptjs = require('bcryptjs');
const { Server } = require("socket.io");
const util = require('util')
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const server = http.createServer(app);
const usersLogin = [];
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



const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
