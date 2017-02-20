const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const socketStream = require('socket.io-stream');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
// const routes = require('./server/routes');

require('./server/models/user.model');
require('./server/models/chatUserRelation.model');
require('./server/models/chatMessage.model');


mongoose.Promise = global.Promise;
const port = 3000;
const connection = 'mongodb://localhost:27017/chat';

let User = mongoose.model('User');
let ChatUserRelation = mongoose.model('ChatUserRelation');
let ChatMessage = mongoose.model('ChatMessage');


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
mongoose.connect(connection);
console.log('MongoDB up and running!');

// INSERTING VALUESSSSS
app.get('/fillChats', (req, res) => {

    // qwerty   =   589dbe874a1dad6d2e933fce
    // Syla     =   58876339aee27b2a20f1e80e
    // Drago    =   5887636bd31e7119948abad9


    // new ChatUserRelation(
    //     {
    //         "creatorId": req.query.accessToken || "589dbe874a1dad6d2e933fce",
    //         "participants": [
    //             "589dbe874a1dad6d2e933fce",
    //             "58876339aee27b2a20f1e80e"
    //         ]
    //     }
    // ).save(function (err, msg) {
    //     console.log('ChatUserRelation --> ', msg);
    // });

    // Adding chat messages to this chat
    // new ChatMessage({
    //     chatId: "58a599029c87b61b600fa279",
    //     userId: "589dbe874a1dad6d2e933fce",
    //     message: "Hi alll",
    //     date: new Date(2017,1,14)
    // }).save();
    // new ChatMessage({
    //     chatId: "58a599029c87b61b600fa279",
    //     userId: "58876339aee27b2a20f1e80e",
    //     message: "Hey, нямам какво да добавя",
    //     date: new Date(2017,1,14)
    // }).save();
});

// GET REQUESTS


app.get('/chatIdForUsers', (req, res) => {

});

app.get('/currentUserInfo', (req, res) => {
    User
        .findById(req.query.accessToken)
        .select('username fullName')
        .then((userData) => {
            res.json(userData);
        });
});

app.get('/fullNamesByString', (req, res) => {
    let regexp = new RegExp(req.query.searchString, "gui");
    User
        .find({fullName: {$regex: regexp}})
        .select('fullName')
        .then((data) => {
            let result = JSON.parse(JSON.stringify(data));

            let final = result.map((item) => {
                item.id = item._id;
                return item;
            });
            res.json(final);
        });
});

app.get('/chatHistoryBrief', (req, res) => {
    ChatUserRelation
        .find({$or: [{creatorId: req.query.accessToken}, {participants: req.query.accessToken}]})
        .select('creatorId participants')
        .then((data) => {
            let result = JSON.parse(JSON.stringify(data));
            let final = result.map((chat) => {

                chat.id = chat._id;
                chat.isFavourite = true;
                chat.isRoom = chat.participants.length > 2;
                chat.isOnline = true;
                chat.lastChatMessageText = 'Lorem ipsum dolor sit amet, consectetur. dolor sit amet, consectetur um dolor sit amet, consectetur. dolor sit amet, consectetur...';
                chat.lastChatDate = new Date(2017, 2, 2);


                return chat;
            });
            res.json(final);
        }).catch(console.log);
});

app.get('/getMessagesBySearchstring', (req, res) => {
    /**
     * params: -
     searchstring – searched string
     userID – mandatory, will search in specific chat session

     return: array of messageIDs that is matching the search pattern
     [
     {
         messageID : 23423
     }
     ]
     */
});


app.get('/chatHistory', (req, res) => {
    console.log(req.query)
    ChatMessage
        .find({chatId: mongoose.Types.ObjectId(req.query.chatId)})
        .then((messages) => {
            let resMessages = JSON.parse(JSON.stringify(messages)).map((msg) => {
                return {
                    messageId: msg._id,
                    authorName: 'Za sega Pesho', //TODO
                    authorId: msg.userId,
                    messageDate: msg.date,
                    messageBody: msg.message,
                    messageType: 1 //TODO
                }
            });

            res.json(resMessages);
        });
});


app.get('/getMatchingUsername', (req, res) => {

    User
        .find({})
        .select('_id username fullName avatar')
        .where('_id').ne(req.searchString)
        .where('username').findOne({"username": {$regex: ".*son.*"}})
        .then((users) => {
            res.json(users);
        });
});


app.get('/users', (req, res) => {
    User
        .find({})
        .select('_id username fullName avatar')
        .where('_id').ne(req.query.loggedUser)
        .then((users) => {
            res.json(users);
        });
});

// POST REQUESTS
app.post('/login', (req, res) => {
    let reqUser = req.body;
    User.findOne(reqUser)
        .select('_id').then((user) => {
        res.json({accessToken: user._id});
    }).catch((err) => {
        res.status(418).send('Invalid username and/or password');
    });
});


app.post('/createRoom', (req, res) => {
    let roomName = req.body.name;
    let userName = req.body.user.username;
    let fullName = req.body.user.fullName;
    let userId = req.body.user.id;

    new Room({
        name: roomName,
        users: [{username: userName, fullName: fullName, id: userId}],
        messages: []
    }).save((err, data) => {
        if (err) {
            console.log(err);
        }

        res.json(data);
    });
});

app.post('/favourite', (req, res) => {
    let user = req.body.data.user;
    let favUser = req.body.data.favUser;
    if (req.body.data.new) {
        User.findByIdAndUpdate(user._id, {
            $push: {
                "favourites": favUser
            }
        }, {safe: true, new: true, upsert: true}, (err, user) => {
            res.json(user.favourites);
        });
    }
    else {
        User.findByIdAndUpdate(user._id, {
            $pull: {
                "favourites": favUser
            }
        }, {safe: true, new: true, upsert: true}, (err, user) => {
            res.json(user.favourites);
        });
    }


});

app.post('/download', (req, res) => {
    let file = path.join(__dirname, 'public/files', req.body.filePath);
    res.download(file, req.body.filePath);
});


let users = [];

io.sockets.on('connection', (socket) => {

    socket.on('message', (data) => {
        //Insert into DB

        new ChatMessage({
            chatId: data.chatid,
            userId: data.userid,
            message: data.message,
            date: new Date()
        }).save(function(error,response){
            if(error){
                console.log(error);
            }else{
                socket.emit('messageReceivedByServer', {response});
            }

        });
    });


    socket.emit('user-connected', 'You are logged in!');

    socket.on('user-disconnected', () => {
        // TODO:
        // io.sockets.emit('user', userId);
    });


    socket.on('chat-open', (chatId) => {
        //TODO:
    });

    socket.on('chat-close', (chatId) => {

    });

    socket.on('message-send', (data) => {
        //TODO
    });

})
;


http.listen(port, () => {
    console.log(`The server is listening on port: ${port}`);
});
