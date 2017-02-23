angular.module('chat')
    .factory('chatService', chatService);

chatService.$inject = ['$http'];

function chatService($http) {
    let service = {
        openChat: openChat, // open chat window with given chatID
        createChat: createChat, // open chat window with given chatID
        getChatIdForUsers: getChatIdForUsers, // open chat window with given chatID
        getChatHistoryBrief: getChatHistoryBrief, // open chat window with given user ID (search in DB for existing chat session with selected user ONLY)
        getChatHistory: getChatHistory,
        getMessagesBySearchstring: getMessagesBySearchstring
    };

    return service;

    function createChat(participants) {
        console.log('createChat--->', participants);
        return $http({
            method: 'POST',
            url: '/createChat',
            headers: { 'Content-Type': 'application/json' },
            data: { participants }
        }).then((response) => {
            return response.data;
        }).catch(console.err);
    }
    function openChat(chatid) {
        console.log('openChat -->chatid', chatid);
    }

    function getChatHistory(chatId, lastMessageId) {
        return $http({
            method: 'GET',
            url: '/chatHistory',
            headers: { 'Content-Type': 'application/json' },
            params: { chatId, lastMessageId }
        }).then((response) => {
            return response.data;
        }).catch(console.err);
    }

    function getChatHistoryBrief() {
        return $http({
            method: "GET",
            url: '/chatHistoryBrief',
            headers: { 'Content-Type': 'application/json' },
            params: { accessToken: localStorage.getItem('accessToken') }
        }).then((response) => {
            return response.data;
        }).catch(err => console.err);
    }

    function getChatIdForUsers(arrayOfUsersIds) {
        return $http({
            method: "GET",
            url: '/chatIdForUsers',
            headers: { 'Content-Type': 'application/json' },
            params: { arrayOfUsersIds }
        }).then((response) => {
            console.log('chatService getChatIdForUsers', response);
            return response.data;
        }).catch(err => console.err);
    }

    function getMessagesBySearchstring(chatId, searchedString) {
        return $http({
            method: "GET",
            url: '/messagesBySearchstring',
            headers: { 'Content-Type': 'application/json' },
            params: { chatId, searchedString }
        }).then((response) => {
            return response.data;
        }).catch(err => console.err);
    }


}