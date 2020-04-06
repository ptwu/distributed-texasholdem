// server-side socket.io event handling
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

	//precondition: user must be able to make the move in the first place.
	socket.on('moveMade', (data) => {
		//worst case complexity O(num_rooms * num_players_in_room)
		let game = rooms.find(r => r.findPlayer(socket.id).socket.id === socket.id);

		if (game != undefined) {
			if (game.findPlayer(socket.id).blindValue == 'Big Blind' && game.roundData.bets.length == 1) game.bigBlindWent = true;
			if (data.move == 'fold') {
				let preFoldBetAmount = 0;

				for (let i = 0; i < game.roundData.bets.length; i++) {
					let roundDataStage = game.roundData.bets[i].find(a => a.player == game.findPlayer(socket.id).username);
					console.log('Stage ' + i + ' ' + roundDataStage);
					if (roundDataStage != undefined && roundDataStage.bet != 'Fold') {
						preFoldBetAmount += roundDataStage.bet;
					}
				}
				console.log('Prefold Bet' + preFoldBetAmount);
				console.log(game.foldPot);
				game.findPlayer(socket.id).setStatus('Fold');
				game.foldPot = game.foldPot + preFoldBetAmount;
				if (game.roundData.bets[game.roundData.bets.length - 1].some(a => a.player == game.findPlayer(socket.id).username)) {
					game.roundData.bets[game.roundData.bets.length - 1] = game.roundData.bets[game.roundData.bets.length - 1].map(a => a.player == game.findPlayer(socket.id).username ? { player: game.findPlayer(socket.id).getUsername(), bet: 'Fold' } : a);
				} else {
					game.roundData.bets[game.roundData.bets.length - 1].push({ player: game.findPlayer(socket.id).getUsername(), bet: 'Fold' });
				}
				game.moveOntoNextPlayer();
			} else if (data.move == 'check') {
				let currBet = 0;
				if (game.roundData.bets[game.roundData.bets.length - 1].find(a => a.player == game.findPlayer(socket.id).username) != undefined) {
					currBet = game.roundData.bets[game.roundData.bets.length - 1].find(a => a.player == game.findPlayer(socket.id).username).bet;
					game.roundData.bets[game.roundData.bets.length - 1] = game.roundData.bets[game.roundData.bets.length - 1].map(a => a.player == game.findPlayer(socket.id).username ? { player: game.findPlayer(socket.id).getUsername(), bet: currBet } : a);
				} else {
					game.roundData.bets[game.roundData.bets.length - 1].push({ player: game.findPlayer(socket.id).getUsername(), bet: currBet });
				}
				game.moveOntoNextPlayer();
			} else if (data.move == 'bet') {
				game.roundData.bets[game.roundData.bets.length - 1].push({ player: game.findPlayer(socket.id).getUsername(), bet: data.bet });
				game.findPlayer(socket.id).money = game.findPlayer(socket.id).money - data.bet;
				game.moveOntoNextPlayer();
			} else if (data.move == 'call') {
				let currBet;
				if ((game.roundData.bets[game.roundData.bets.length - 1].find(a => a.player == game.findPlayer(socket.id).username)) != undefined)
					currBet = game.roundData.bets[game.roundData.bets.length - 1].find(a => a.player == game.findPlayer(socket.id).username).bet;
				if (currBet == undefined) {
					game.roundData.bets[game.roundData.bets.length - 1].push({ player: game.findPlayer(socket.id).getUsername(), bet: game.getCurrentMaxBet() });
					game.findPlayer(socket.id).money = game.findPlayer(socket.id).money - game.getCurrentMaxBet();
				} else {
					game.roundData.bets[game.roundData.bets.length - 1] = game.roundData.bets[game.roundData.bets.length - 1].map(a => a.player == game.findPlayer(socket.id).username ? { player: game.findPlayer(socket.id).getUsername(), bet: game.getCurrentMaxBet() } : a);
					game.findPlayer(socket.id).money = game.findPlayer(socket.id).money - (game.getCurrentMaxBet() - currBet);
					game.moveOntoNextPlayer();
				}
			} else if (data.move == 'raise') {
				const currBet = game.roundData.bets[game.roundData.bets.length - 1].find(a => a.player == game.findPlayer(socket.id).username).bet;
				game.roundData.bets[game.roundData.bets.length - 1] = game.roundData.bets[game.roundData.bets.length - 1].map(a => a.player == game.findPlayer(socket.id).username ? { player: game.findPlayer(socket.id).getUsername(), bet: data.bet } : a);
				game.findPlayer(socket.id).money = game.findPlayer(socket.id).money - (data.bet - currBet);
				game.moveOntoNextPlayer();
			}
		} else { console.log('ERROR: can\'t find game!!!'); }
	});

	socket.on('disconnect', () => console.log('disconnect ' + socket.id));
});

server.listen(3000);