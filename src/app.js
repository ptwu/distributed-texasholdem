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
    if (data.username == '' || data.username.length > 12) {
      socket.emit('hostRoom', undefined);
    } else {
      let code;
      do {
        code =
          '' +
          Math.floor(Math.random() * 10) +
          Math.floor(Math.random() * 10) +
          Math.floor(Math.random() * 10) +
          Math.floor(Math.random() * 10);
      } while (rooms.length != 0 && rooms.some((r) => r.getCode() === code));
      const game = new Game(code, data.username);
      rooms.push(game);
      game.addPlayer(data.username, socket);
      game.emitPlayers('hostRoom', {
        code: code,
        players: game.getPlayersArray(),
      });
    }
  });

  socket.on('join', (data) => {
    const game = rooms.find((r) => r.getCode() === data.code);
    if (
      game == undefined ||
      game.getPlayersArray().some((p) => p == data.username) ||
      data.username == undefined ||
      data.username.length > 12
    ) {
      socket.emit('joinRoom', undefined);
    } else {
      game.addPlayer(data.username, socket);
      rooms = rooms.map((r) => (r.getCode() === data.code ? game : r));
      game.emitPlayers('joinRoom', {
        host: game.getHostName(),
        players: game.getPlayersArray(),
      });
      game.emitPlayers('hostRoom', {
        code: data.code,
        players: game.getPlayersArray(),
      });
    }
  });

  socket.on('startGame', (data) => {
    const game = rooms.find((r) => r.getCode() == data.code);
    if (game == undefined) {
      socket.emit('gameBegin', undefined);
    } else {
      game.emitPlayers('gameBegin', { code: data.code });
      game.startGame();
    }
  });

  socket.on('evaluatePossibleMoves', () => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    if (game.roundInProgress) {
      const possibleMoves = game.getPossibleMoves(socket);
      socket.emit('displayPossibleMoves', possibleMoves);
    }
  });

  socket.on('raiseModalData', () => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    if (game != undefined) {
      socket.emit('updateRaiseModal', {
        topBet: game.getCurrentTopBet(),
        usernameMoney:
          game.getPlayerBetInStage(game.findPlayer(socket.id)) +
          game.findPlayer(socket.id).getMoney(),
      });
    }
  });

  socket.on('startNextRound', () => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    if (game != undefined) {
      if (game.roundInProgress === false) {
        game.startNewRound();
      }
    }
  });

  // precondition: user must be able to make the move in the first place.
  socket.on('moveMade', (data) => {
    // worst case complexity O(num_rooms * num_players_in_room)
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );

    if (game != undefined) {
      if (data.move == 'fold') {
        game.fold(socket);
      } else if (data.move == 'check') {
        game.check(socket);
      } else if (data.move == 'bet') {
        game.bet(socket, data.bet);
      } else if (data.move == 'call') {
        game.call(socket);
      } else if (data.move == 'raise') {
        game.raise(socket, data.bet);
      }
    } else {
      console.log("ERROR: can't find game!!!");
    }
  });

  socket.on('disconnect', () => {
    const game = rooms.find(
      (r) => r.findPlayer(socket.id).socket.id === socket.id
    );
    if (game != undefined) {
      const player = game.findPlayer(socket.id);
      game.disconnectPlayer(player);
      if (game.players.length == 0) {
        if (this.rooms != undefined && this.rooms.length !== 0) {
          this.rooms = this.rooms.filter((a) => a != game);
        }
      }
    }
  });
});

server.listen(PORT, () => console.log(`hosting on port ${PORT}`));
