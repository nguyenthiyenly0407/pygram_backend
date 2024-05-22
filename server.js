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



const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
