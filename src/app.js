// server-side socket.io backend event handling
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const Game = require('./classes/game.js');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 3000;

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

	socket.on('evaluatePossibleMoves', () => {
		let game = rooms.find(r => r.findPlayer(socket.id).socket.id === socket.id);
		if (game.roundInProgress) {
			const player = game.findPlayer(socket.id);
			const playerBet = game.getPlayerBetInStage(player);
			const topBet = game.getCurrentTopBet();
			let possibleMoves = { fold: 'yes', check: 'yes', bet: 'yes', call: topBet, raise: 'yes' }
			if (player.getStatus() == 'Fold') {
				console.log('Error: Folded players should not be able to move.');
			}
			if (topBet != 0) {
				possibleMoves.bet = 'no';
				possibleMoves.check = 'no';
				if (player.blindValue == 'Big Blind' && !game.bigBlindWent && topBet == 2) possibleMoves.check = 'yes';
			} else {
				possibleMoves.raise = 'no';
			}
			if (topBet <= playerBet) {
				possibleMoves.call = 'no';
			}
			if (topBet >= player.getMoney() + playerBet) {
				possibleMoves.raise = 'no';
				possibleMoves.call = 'all-in';
			}
			socket.emit('displayPossibleMoves', possibleMoves);
		}
	});

	socket.on('raiseModalData', () => {
		let game = rooms.find(r => r.findPlayer(socket.id).socket.id === socket.id);
		if (game != undefined) {
			socket.emit('updateRaiseModal', {
				'topBet': game.getCurrentTopBet(),
				'usernameMoney': game.getPlayerBetInStage(game.findPlayer(socket.id)) + game.findPlayer(socket.id).getMoney()
			})
		}
	});

	socket.on('startNextRound', () => {
		let game = rooms.find(r => r.findPlayer(socket.id).socket.id === socket.id);
		if (game != undefined) {
			if (game.roundInProgress === false) {
				game.startNewRound();
			}
		}
	});

	//precondition: user must be able to make the move in the first place.
	socket.on('moveMade', (data) => {
		//worst case complexity O(num_rooms * num_players_in_room)
		let game = rooms.find(r => r.findPlayer(socket.id).socket.id === socket.id);

		if (game != undefined) {
			if (game.findPlayer(socket.id).blindValue == 'Big Blind' && game.roundData.bets.length == 1) game.bigBlindWent = true;
			if (data.move == 'fold') {
				game.fold();
			} else if (data.move == 'check') {
				game.check(socket);
			} else if (data.move == 'bet') {
				game.bet(socket, data.bet);
			} else if (data.move == 'call') {
				game.call(socket);
			} else if (data.move == 'raise') {
				game.raise(socket, data.bet);
			}
		} else { console.log('ERROR: can\'t find game!!!'); }
	});

	socket.on('disconnect', () => {
		let game = rooms.find(r => r.findPlayer(socket.id).socket.id === socket.id);
		if (game != undefined) {
			const player = game.findPlayer(socket.id);
			game.disconnectPlayer(player);
			if (game.players.length == 0) {
				if (this.rooms != undefined && this.rooms.length !== 0) {
					this.rooms = this.rooms.filter(a => a != game);
				}
			}
		}
	});
});

server.listen(PORT, () => console.log(`hosting on port ${PORT}`));