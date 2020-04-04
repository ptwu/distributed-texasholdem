// server-side game logic
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const Game = require('./classes/game.js');
const Card = require('./classes/card.js');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use('/', express.static(__dirname + '/client'));

let rooms = [];

io.on('connection', (socket) => {
	console.log('new connection ', socket.id);
	socket.on('host', (data) => {
		if (data.username == "" || data.username.length > 12) {
			socket.emit('hostRoom', undefined);
		} else {
			let code;
			do {
				code = "" + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10);
			} while (rooms.length != 0 && (rooms.some(r => r.getCode == code)));
			let game = new Game(code, data.username);
			rooms.push(game);
			game.addPlayer(data.username, socket);
			game.emitPlayers('hostRoom', { 'code': code, 'players': game.getPlayersArray() });
		}
	});

	socket.on('join', (data) => {
		let game = rooms.find(r => r.getCode() === data.code);
		if ((game == undefined || game.getPlayersArray().some(p => p == data.username)) || data.username == undefined || data.username.length > 12) {
			socket.emit('joinRoom', undefined);
		} else {
			game.addPlayer(data.username, socket);
			rooms = rooms.map(r => (r.getCode() === data.code) ? game : r);
			game.emitPlayers('joinRoom', { 'host': game.getHostName(), 'players': game.getPlayersArray() });
			game.emitPlayers('hostRoom', { 'code': data.code, 'players': game.getPlayersArray() })
		}
	});

	socket.on('startGame', (data) => {
		let game = rooms.find(r => r.getCode() == data.code);
		if (game == undefined) {
			socket.emit('gameBegin', undefined);
		} else {
			game.emitPlayers('gameBegin', { 'code': data.code });
			game.startGame();
		}
	});

	socket.on('moveMade', (data) => {
		//O(num_rooms * num_players_in_room)

		let game = rooms.find(r => r.findPlayer(socket.id).socket.id === socket.id);
		if (game != undefined) {
			if (data.move == 'fold') {
				game.moveOntoNextPlayer();
			} else if (data.move == 'check') {
				game.moveOntoNextPlayer();
			} else if (data.move == 'call') {
				game.moveOntoNextPlayer();
			} else if (data.move == 'raise') {
				game.moveOntoNextPlayer();
			}
		} else { console.log('ERROR: can\'t find game!!!'); }
	});

	// socket.on('sendCard', (payload) => {
	// 	console.log(payload);
	// 	var game = rooms[payload.gameInfo.roomIndex];
	// 	var player = game.findPlayer(socket.id);

	// 	player.currentCard = new Card(payload.cardValue);
	// 	game.currentlyPlayed++;

	// 	if (game.currentlyPlayed == game.getNumPlayers()) {
	// 		game.endTurn();
	// 	}

	// 	game.updateGame();
	// 	game.printPretty();

	// 	// If somebody has no cards left, end game.
	// 	if (game.hasGameEnded()) {
	// 		console.log('Game ended');
	// 		game.emitPlayers('gameEnded', { 'winner': game.gameWinner.username });
	// 	}

});

// 	socket.on('disconnect', () => console.log('disconnect'));
// });

server.listen(3000);