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
		if (data.username == "") {
			socket.emit('hostRoom', undefined);
		} else {
			const code = "" + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10)
			let game = new Game(code, data.username);
			rooms.push(game);
			game.addPlayer(data.username, socket);
			game.emitPlayers('hostRoom', { 'code': code, 'players': game.getPlayersArray() });
		}
	});

	socket.on('join', (data) => {
		let game = rooms.find(r => r.getCode() === data.code);
		if (game == undefined || data.username == undefined) {
			socket.emit('joinRoom', undefined);
		} else {
			game.addPlayer(data.username, socket);
			rooms = rooms.map(r => (r.getCode() === data.code) ? game : r);
			game.emitPlayers('joinRoom', { 'host': game.getHostName(), 'players': game.getPlayersArray() });
			game.emitPlayers('hostRoom', { 'code': data.code, 'players': game.getPlayersArray() })
		}
	});

	socket.on('sendCard', (payload) => {
		console.log(payload);
		var game = rooms[payload.gameInfo.roomIndex];
		var player = game.findPlayer(socket.id);

		player.currentCard = new Card(payload.cardValue);
		game.currentlyPlayed++;

		if (game.currentlyPlayed == game.getNumPlayers()) {
			game.endTurn();
		}

		game.updateGame();
		game.printPretty();

		// If somebody has no cards left, end game.
		if (game.hasGameEnded()) {
			console.log('Game ended');
			game.emitPlayers('gameEnded', { 'winner': game.gameWinner.username });
		}

	});

	socket.on('disconnect', () => console.log('disconnect'));
});

// app.get('/rooms', function (req, res) {
// 	var content = '';
// 	content += '<h1>Latest Rooms</h1>';
// 	content += '<ul>';

// 	for (var i = rooms.length - 1; i >= 0; i--) {
// 		content += '<li>Num. players: ' + rooms[i].getNumPlayers() + '; Status: ' + rooms[i].status + '</li>';
// 	}
// 	content += '</ul>';

// 	res.send(content);
// });

// app.get('/rooms/:id', function (req, res) {
// 	if (typeof rooms[req.params.id] != 'undefined') {
// 		const game = rooms[req.params.id];
// 		res.send('Num. players: ' + game.getNumPlayers() + '; Status: ' + game.status);
// 	} else {
// 		res.send('Error: this room does not exist.');
// 	}

// });

server.listen(3000);