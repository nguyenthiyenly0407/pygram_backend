const express = require("express");
const mysql = require('mysql');
const app = express();
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
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
const apisearchrouter = require("./API/apisearch")

app.use('/api/signup', apisignupRouter);
app.use('/api/login', apisigninrouter);
app.use('/api/user', apiuserrouter);
app.use('/api/poststatus',apipostrouter);
app.use('/api/getpoststatus', apigetpostrouter);
app.use('/api/cmtstudent',apicmtstrouter);
app.use('/api/getcmt',apigetcmtrouter)
app.use('/api/search',apisearchrouter)

// Xử lý kết nối của socket.io
io.on('connection', (socket) => {
  
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
    socket.on('userLoggedIn', (userData) => {
        console.log(`User logged in: ${userData.name}, ID: ${userData.id}`);
        // Gửi thông điệp 'userLoggedIn' về client với dữ liệu userData
        io.emit('userLoggedIn', userData);

    });
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
