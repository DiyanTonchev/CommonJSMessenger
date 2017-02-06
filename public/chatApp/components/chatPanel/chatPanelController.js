angular.module('chat').controller('ChatPanelCtrl', ChatPanelCtrl);

ChatPanelCtrl.$inject = ['$scope', 'dataservice', '$window'];

function ChatPanelCtrl($scope, dataservice, $window) {


    let vm = this;

    //Init Variables
    vm.chatToggle = false;
    vm.roomToggle = false;
    vm.singleToggle = false;
    vm.rooms = [];
    vm.users = [];
    vm.chatInstance = {};
    vm.roomInstance = {};

    vm.panelsToggle = panelsToggle;
    vm.changeChatInstance = changeChatInstance;
    vm.sendMsgToChatInstance = sendMsgToChatInstance;
    vm.createRoom = createRoom;
    vm.changeRoomInstance = changeRoomInstance;
    vm.sendMsgToRoomInstance = sendMsgToRoomInstance;
    vm.addUserToRoom = addUserToRoom;
    vm.fileUpload = fileUpload;
    vm.chatFileUpload = chatFileUpload;
    vm.fileDownload = fileDownload;

    //Init Functions
    // getUsersData();

    //Sockets

    vm.socket = io.connect();

    vm.socket.on('connect_error', function(err) {
        let url = "http://" + $window.location.host + "/disconnect";
        $window.location.href = url;
    });

    vm.socket.on('login', (message) => {
        vm.socket.emit('users', $scope.user._id);
        vm.socket.emit('rooms', $scope.user._id);
    }, (err) => {
        console.log(err);
    });

    vm.socket.on('users', (data) => {
        vm.users = data.map((user) => {
            return JSON.parse(user);
        });
        $scope.$apply();
    });

    vm.socket.on('chats', (data) => {
        vm.chatInstance._id = data._id;
        vm.chatInstance.friend = data.friend;
        vm.chatInstance.friendId = data.friendId;
        vm.chatInstance.user1 = data.user1;
        vm.chatInstance.user2 = data.user2;
        vm.chatInstance.messages = [];
        data.messages.forEach((msg) => {
            if ($scope.user.fullName == msg.author) {
                msg.styleClass = 'user'
            }
            else {
                msg.styleClass = 'friend'
            }
            if(!msg.isFile) {
                vm.chatInstance.messages.push(msg);
            }
            else{
                if(msg.extension == "jpg" || msg.extension == "png"){
                    msg.isImg = true;
                    vm.chatInstance.messages.push(msg);
                }
                else{
                    msg.isImg = false;
                    vm.chatInstance.messages.push(msg);
                }
            }
        });
        if (vm.chatInstance.user1._id == $scope.user._id) {
            vm.chatInstance.friend = vm.chatInstance.user2.fullName;
            vm.chatInstance.friendId = vm.chatInstance.user2._id;
        }
        else {
            vm.chatInstance.friend = vm.chatInstance.user1.fullName;
            vm.chatInstance.friendId = vm.chatInstance.user1._id;
        }
        $scope.$apply();
    });


    vm.socket.on('notifications', (data) => {
        if (vm.chatInstance.friend != data.author) {
            let user = vm.users.filter((user) => {
                return user.fullName == data.author;
            })[0];
            user.newText = true;
            $scope.$apply();
        }
    });

    vm.socket.on('chat-connection', (msg) => {


        if ($scope.user.fullName == msg.author) {
            msg.styleClass = 'user'
        }
        else {
            msg.styleClass = 'friend'
        }
        if(!msg.isFile) {
            vm.chatInstance.messages.push(msg);
        }
        else{
            if(msg.extension == "jpg" || msg.extension == "png"){
                msg.isImg = true;
                vm.chatInstance.messages.push(msg);
            }
            else{
                msg.isImg = false;
                vm.chatInstance.messages.push(msg);
            }
        }
        $scope.$apply();

    });

    vm.socket.on($scope.user._id, (data) => {
        let isRoom = false;
        vm.rooms.forEach(room => {
            if(room._id == data._id) {
                isRoom = true;
            }
        });
        if(!isRoom){
            vm.rooms.push(data);
        }
    });

    vm.socket.on('room-connections', (data) => {
        vm.roomInstance._id = data._id;
        vm.roomInstance.name = data.name;
        vm.roomInstance.users = data.users;
        vm.roomInstance.messages = [];
        data.messages.forEach(msg => {
            if ($scope.user.fullName == msg.author) {
                msg.styleClass = 'user'
            }
            else {
                msg.styleClass = 'friend'
            }
            if(!msg.isFile) {
                vm.roomInstance.messages.push(msg);
            }
            else{
                if(msg.extension == "jpg" || msg.extension == "png"){
                    msg.isImg = true;
                    vm.roomInstance.messages.push(msg);
                }
                else{
                    msg.isImg = false;
                    vm.roomInstance.messages.push(msg);
                }
            }
            $scope.$apply();
        });
    });

    vm.socket.on('room-messages', (msg) => {

        if ($scope.user.fullName == msg.author) {
            msg.styleClass = 'user'
        }
        else {
            msg.styleClass = 'friend'
        }
        if(!msg.isFile) {
            vm.roomInstance.messages.push(msg);
        }
        else{
            if(msg.extension == "jpg" || msg.extension == "png"){
                msg.isImg = true;
                vm.roomInstance.messages.push(msg);
            }
            else{
                msg.isImg = false;
                vm.roomInstance.messages.push(msg);
            }
        }
        $scope.$apply();
    });

    vm.socket.on('room-notifications', (data) => {

    });


    //Function Declarations

    function getUsersData() {
        return dataservice.getUsersData($scope.user._id).then((users) => {
            vm.users = users;

        }, (err) => {
            console.log(err);
        });
    }


    function panelsToggle() {
        vm.chatToggle = !vm.chatToggle;
        vm.roomToggle = false;
        vm.singleToggle = false;
    }


    function changeChatInstance(friend) {
        vm.socket.emit('join-single-room', {user: $scope.user, friend: friend});
        let user = vm.users.filter((user) => {
            return user._id == friend._id;
        })[0];
        user.newText = false;
        vm.roomToggle = false;
        vm.singleToggle = true;
    }

    function sendMsgToChatInstance(room, msg) {
        vm.socket.emit('chat-connection', {
            room: room._id,
            msg: msg,
            author: $scope.user.fullName,
            friend: room.friendId
        });
    }

    function changeRoomInstance(room) {
        vm.socket.emit('join-room', {room:room, user: $scope.user});
        vm.roomToggle = true;
        vm.singleToggle = false;
    }

    function sendMsgToRoomInstance(room, msg) {
        vm.socket.emit('room-messages', {
            room: room._id,
            msg: msg,
            author: $scope.user.fullName
        });
    }

    function createRoom(roomName) {
        dataservice.createNewRoom({
            name: roomName,
            user: {username: $scope.user.username, fullName: $scope.user.fullName, id: $scope.user._id}
        }).then(function (room) {
            vm.rooms.push(room);
        });
    }

    function addUserToRoom(user, roomInstance) {
        vm.socket.emit('join-user-to-room', {user: user, roomInstance: roomInstance});
    }

    function fileUpload(file) {
        let fileExtension = file.name.split('.').pop();
        let stream = ss.createStream();
        // upload a file to the server.
        ss(vm.socket).emit('fileUpload', stream,
            {
                size: file.size,
                extension: fileExtension,
                roomId:vm.chatInstance._id,
                author:$scope.user.fullName,
            });
        ss.createBlobReadStream(file).pipe(stream);
    }

    function chatFileUpload(file) {
        let fileExtension = file.name.split('.').pop();
        let stream = ss.createStream();
        // upload a file to the server.
        ss(vm.socket).emit('chatFileUpload', stream,
            {
                size: file.size,
                extension: fileExtension,
                roomId:vm.roomInstance._id,
                author:$scope.user.fullName,
            });
        ss.createBlobReadStream(file).pipe(stream);
    }

    function fileDownload(filePath, fileExtension) {
        let filepath = filePath + '.' + fileExtension;
        dataservice.downloadFile(filepath).then((response) => {
            console.log(response);
        });
    }


};