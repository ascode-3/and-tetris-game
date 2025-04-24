const io = require('socket.io-client');

const socket = io('https://and-tetris-game.onrender.com');

module.exports = socket; 