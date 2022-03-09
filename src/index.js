const express = require('express');
const path = require('path');
const http = require('http');
const socket = require('socket.io');
const Filter = require('bad-words');
const { prepMsg } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT;
const io = socket(server);

const publicPath = path.join(__dirname, '../public');

app.use(express.static(publicPath));

io.on('connection', async (socket) => {
    // log message that user connected on the server
    console.log('user connected to server');

    // user joins room
    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room})

        if (error) {
            return callback(error);
        }

        socket.join(user.room);

        // send welcome message to logged in user
        let message = prepMsg('Welcome!', user.username);
        socket.emit('serverSendMessage', message);

        // notify everyone EXCEPT CURRENT CONNECTION that user has connected
        message.text = `${user.username} has joined the room`;
        socket.broadcast.to(user.room).emit('serverSendMessage', message);
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback();
    })

    // user sends a message to chat
    socket.on('clientSendMessage', ({ msg, username, room }, callback) => {
        const filter = new Filter();

        // ignore message if profane and notify user
        if (filter.isProfane(msg)) return callback('Profanity is not allowed!')

        // locate user
        const user = getUser(socket.id);

        // send message event to EVERYONE
        let message = prepMsg(msg, user.username)
        io.to(room).emit('serverSendMessage', message);

        // notify sender message was delivered
        callback();
    })

    // process event when user disconnects
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            let message = prepMsg(`${user.username} has left the room.`, user.username);
            io.to(user.room).emit('serverSendMessage', message);
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    // broadcast location coords received from client to other clients
    socket.on('userSendLocation', (loc, callback) => {
        if (!loc) return callback('Could not retrieve the location.');

        // get user
        const user = getUser(socket.id);
        loc.username = user.username;
        io.to(user.room).emit('serverSendLocation', loc);
        callback();
    })
})

server.listen(port, () => console.log('Server started on port ' + port + "."));