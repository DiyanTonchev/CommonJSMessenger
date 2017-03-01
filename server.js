const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const socketStream = require('socket.io-stream');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

require('./server/models/user.model');
require('./server/models/chatUserRelation.model');
require('./server/models/chatMessage.model');


mongoose.Promise = global.Promise;
const port = 3000;
const connection = 'mongodb://localhost:27017/chat';

let User = mongoose.model('User');
let ChatUserRelation = mongoose.model('ChatUserRelation');
let ChatMessage = mongoose.model('ChatMessage');


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
mongoose.connect(connection);
console.log('MongoDB up and running!');


// GET REQUESTS
app.get('/chatIdForUsers', (req, res) => {
    let inArr = [];
    let andArr = [];
    
     for (let v in req.query.arrayOfUsersIds) {
        if (!req.query.arrayOfUsersIds[v] || req.query.arrayOfUsersIds[v] == "undefined") {
            res.status(418).send({ "message": "Not a valid request." });
            return;
        }
        andArr.push({ "participants": { $in: [mongoose.Types.ObjectId(req.query.arrayOfUsersIds[v])] } })
    }
    andArr.push({ "participants": { $size: req.query.arrayOfUsersIds.length } });
    
    
       ChatUserRelation
        .find(
        {
            $and: andArr
        }
        )
        .select('_id')
        .then((userData) => {
            if (userData[0]) {
                res.json(userData[0]._id);
            } else {
                let creatorid = mongoose.Types.ObjectId(req.query.arrayOfUsersIds[0]);
                let participants = req.query.arrayOfUsersIds.map((id) => {
                    return mongoose.Types.ObjectId(id);
                })

                new ChatUserRelation({
                    creatorId: creatorid,
                    participants: participants
                }).save().then(function (response) {
                    res.json(response._id);
                }).catch(console.log);
            }
        }).catch(console.log);
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
        .find({ fullName: { $regex: regexp } })
        .where('_id').ne(req.query.userId)
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
        .aggregate([
            {
                $match: {
                    $or: [
                        { creatorId: mongoose.Types.ObjectId(req.query.accessToken) },
                        { participants: mongoose.Types.ObjectId(req.query.accessToken) }
                    ]
                }
            },
            {
                $lookup: {
                    from: "chatmessages",
                    localField: "_id",
                    foreignField: "chatId",
                    as: "ChatMessages"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "participants",
                    foreignField: "_id",
                    as: "Users"
                }
            },
            {
                $sort: { date: 1 }
            },
        ]).then(function (data) {
            let result = [];
            let chat, lastMessageInfo;
            for (let v in data) {
                chat = data[v];
                lastMessageInfo = chat.ChatMessages[chat.ChatMessages.length - 1];
                result.push({
                    id: chat._id,
                    isRoom: chat.participants.length > 2,
                    userId: chat.creatorId,
                    participants: chat.participants.map(function (part) {
                        return getUserById(chat.Users, part).fullName
                    }),
                    lastChatDate: lastMessageInfo.date,
                    lastChatMessageText: lastMessageInfo.message,
                    lastChatSender: {
                        fullName: getUserById(chat.Users, lastMessageInfo.userId).fullName
                    }
                })
            }
            res.json(result);
        }).catch(console.log);
});


app.get('/chatHistory', (req, res) => {
    ChatUserRelation
        .aggregate([
            {
                $match: { _id: mongoose.Types.ObjectId(req.query.chatId) }
            },
            {
                $lookup: {
                    from: "chatmessages",
                    localField: "_id",
                    foreignField: "chatId",
                    as: "ChatMessages"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "participants",
                    foreignField: "_id",
                    as: "Users"
                }
            },
            {
                $sort: { date: 1 }
            },
        ]).then(function (data) {
            let allUsers = data[0].Users;



            let result = {
                participants: data[0].participants.map((party) => {
                    return getUserById(allUsers, party).fullName
                }),
                messages: []
            };

            for (let v in data[0].ChatMessages) {
                message = data[0].ChatMessages[v];
                result.messages.push({
                    messageid: message._id,
                    authorName: getUserById(allUsers, message.userId).fullName,
                    userid: message.userId,
                    date: message.date,
                    message: message.message,
                    messageType: 1 // TODO
                })
            }
            res.json(result);
        }).catch(console.log);
});


app.get('/messagesBySearchstring', (req, res) => {
    let chatId = req.query.chatId;
    let regexp = new RegExp(req.query.searchedString, "gui");
    ChatMessage
        .find({ chatId: mongoose.Types.ObjectId(chatId), message: { $regex: regexp } })
        .then((messages) => {
            res.json(messages);
        })
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
            res.json({ accessToken: user._id });
        }).catch((err) => {
            res.status(418).send('Invalid username and/or password');
        });
});

app.post('/createChat', (req, res) => {
    let creatorid = mongoose.Types.ObjectId(req.body.creatorid);
    let participants = req.body.participants.map((id) => {
        return mongoose.Types.ObjectId(id);
    })

    new ChatUserRelation({
        creatorId: creatorid,
        participants: participants
    }).save().then(function (response) {
        res.json(response._id);
    }).catch(console.log);
});


var onlineUsers = {};
io.sockets.on('connection', (client) => {


    client.on('user connected', function (data) {
        onlineUsers[data.accessToken] = {
            client: client
        };
        console.log(data.accessToken + ' connected', 'total online (' + Object.size(onlineUsers) + ')');


        onlineUsers[data.accessToken].client.on('message', (data) => {
            //Insert into DB
            new ChatMessage({
                chatId: data.chatid,
                userId: data.userid,
                message: data.message,
                date: new Date()
            }).save(function (error, response) {
                if (error) {
                    console.log(error);
                } else {
                    ChatUserRelation
                        .findById(mongoose.Types.ObjectId(data.chatid))
                        .select('participants')
                        .then(function (result) {
                            for (let v in result.participants) {
                                let participant = result.participants[v];
                                if (!onlineUsers[participant].client) continue;
                                onlineUsers[participant].client.emit('new message', {
                                    messageid: response._id,
                                    chatId: response.chatId,
                                    date: response.date,
                                    message: response.message,
                                    userid: response.userId,
                                });

                                if (participant != data.userid) {
                                    onlineUsers[participant].client.emit('new message notification', {
                                        chatId: response.chatId,
                                        message: response.message,
                                        userId: response.userId
                                    })
                                }

                            }
                        });
                }

            });
        });


    });
    client.on('disconnect', function (data) {
        for (let v in onlineUsers) {
            if (onlineUsers[v].client.id == client.id) {
                delete onlineUsers[v];
                break;
            }
        }
        console.log(client.id + ' went offline (' + Object.size(onlineUsers) + ')');
    });
});


http.listen(port, () => {
    console.log(`The server is listening on port: ${port}`);
});


Object.size = function (obj) {
    let size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function getUserById(usersArray, userId) {
    for (let v in usersArray) {
        if (usersArray[v]._id + '' == userId + '') return usersArray[v];
    }
    return false;
}