const Deck = require('./deck.js');
const Player = require('./player.js');
const Card = require('./card.js');

const Game = function (name, host) {
	this.deck = new Deck();
	this.host = host;
	this.players = [];
	this.status = 0;
	this.cardsPerPlayer = 2;
	this.currentlyPlayed = 0;
	this.gameWinner = null;
	this.gameName = name;
	this.roundNum;
	this.roundData = {};
	this.currentBet = 0;
	this.community = [];

	const constructor = function () {
		this.roundNum = 0;
		this.roundData = { 'bigBlind': '', 'smallBlind': '', 'turn': '', 'currentBet': 0 };
	}(this);

	this.startNewRound = () => {
		if (roundNum == 0) {
			const bigBlindIndex = Math.floor(Math.random() * this.players.length);
			const smallBlindIndex = (bigBlindIndex + 1 >= this.players.length) ? 0 : bigBlindIndex + 1;
			for (let i = 0; i < this.players.length; i++) {
				if (i === bigBlindIndex) {
					this.players[i].setBlind('Big Blind');
				} else if (i === smallBlindIndex) {
					this.players[i].setBlind('Small Blind');
				} else {
					this.players[i].setBlind('none');
				}
			}
			const goFirstIndex = (bigBlindIndex - 1 < 0) ? (this.players.length - 1) : bigBlindIndex - 1;
			roundData.bigBlind = this.players[bigBlindIndex].getUsername();
			roundData.smallBlind = this.players[smallBlindIndex].getUsername();
			roundData.turn = this.players[goFirstIndex].getUsername();
			this.players[goFirstIndex].setStatus('Their Turn');
			roundData.currentBet = 2;
			//preflop left of big blind and then other stages are small blind
			//then positions move to the left
		} else {
			const bigBlindIndex = (roundData.bigBlind - 1 < 0) ? (this.players.length - 1) : roundData.bigBlind - 1;
			const smallBlindIndex = (roundData.smallBlind - 1 < 0) ? (this.players.length - 1) : roundData.smallBlind - 1;
			for (let i = 0; i < this.players.length; i++) {
				if (i === bigBlindIndex) {
					players[i].setBlind('Big Blind');
				} else if (i === smallBlindIndex) {
					players[i].setBlind('Small Blind');
				} else {
					players[i].setBlind('none');
				}
			}
			roundData.bigBlind = this.players[bigBlindIndex].getUsername();
			roundData.smallBlind = this.players[smallBlindIndex].getUsername();
			roundData.turn = this.players[smallBlindIndex].getUsername();
			this.players[smallBlindIndex].setStatus('Their Turn');
			if (this.players[bigBlindIndex].money < 2) {
				this.players[bigBlindIndex].money = 0;
				this.players[bigBlindIndex].allInAmt = 1;
			}
		}
		roundNum++;
		roundData.stageName = 'Pre-Flop';
		roundData.pot = 0;

		this.rerender();

	};

	this.rerender = () => {
		let playersData = [];
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			playersData.push({ 'username': this.players[pn].getUsername(), 'status': this.players[pn].getStatus(), 'money': this.players[pn].getMoney() })
		}
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			this.players[pn].emit('rerender', { 'username': this.players[pn].getUsername(), 'round': roundNum, 'stage': roundData.stageName, 'pot': roundData.pot, 'players': playersData, 'myMoney': this.players[pn].getMoney(), 'myStatus': this.players[pn].getStatus() });
		}
	}

	this.moveOntoNextPlayer = () => {
		if (this.status == 0) {
			this.status = 1;

		} else {
			this.status = 0;
			startNewRound();
		}
	}

	this.setCardsPerPlayer = (numCards) => {
		this.cardsPerPlayer = numCards;
	};

	this.getHostName = () => { return this.host; };

	this.getPlayersArray = () => { return this.players.map(p => { return p.getUsername(); }) };

	this.getCode = () => { return this.gameName; };

	this.addPlayer = (playerName, socket) => {
		this.players.push(new Player(playerName, socket));
	};

	this.getNumPlayers = () => {
		return this.players.length;
	};

	this.startGame = () => {
		this.dealCards();
		this.emitPlayers('startGame', { 'players': this.players.map(p => { return p.username; }) });
		this.startNewRound();
		this.printPretty();
	};

	this.dealCards = () => {
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			for (let i = 0; i < this.cardsPerPlayer; i++) {
				this.players[pn].addCard(this.deck.dealRandomCard());
			}
		}

		this.refreshCards();
	};

	this.refreshCards = function () {
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			this.players[pn].cards.sort((a, b) => {
				return a.compare(b);
			});

			this.players[pn].emit("dealt", { 'username': this.players[pn].getUsername(), 'cards': this.players[pn].cards, 'players': this.players.map((p) => { return p.username; }) });
		}
	};

	this.emitPlayers = (eventName, payload) => {
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			this.players[pn].emit(eventName, payload);
		}
	};

	this.findPlayer = (socketId) => {
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			if (this.players[pn].socket.id === socketId) {
				return this.players[pn];
			}
		}
		return undefined;
	};

	this.printPretty = () => {
		console.log('----------------- GAME');
		console.log('Status', this.status);
		console.log('Players:');
		this.players.map(p => p.printPretty());
		console.log('----------------- GAME');
	};

};

module.exports = Game;