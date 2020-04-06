// server-side game logic for a texas hold 'em game
const Deck = require('./deck.js');
const Player = require('./player.js');
const Card = require('./card.js');
const Hand = require('pokersolver').Hand;

const Game = function (name, host) {
	this.deck = new Deck();
	this.host = host;
	this.players = [];
	this.status = 0;
	this.cardsPerPlayer = 2;
	this.currentlyPlayed = 0;
	this.gameWinner = null;
	this.gameName = name;
	this.roundNum = 0;
	this.roundData = { 'bigBlind': '', 'smallBlind': '', 'turn': '', 'bets': [] };
	this.community = [];
	this.foldPot = 0;
	this.bigBlindWent = false;
	const constructor = function () {
	}(this);

	this.startNewRound = () => {
		this.foldPot = 0;
		this.bigBlindWent = false;
		let bigBlindIndex, smallBlindIndex;
		this.community = [];
		this.roundData = { 'bigBlind': '', 'smallBlind': '', 'turn': '', 'bets': [] };
		if (this.roundNum == 0) {
			bigBlindIndex = Math.floor(Math.random() * this.players.length);
			smallBlindIndex = (bigBlindIndex + 1 >= this.players.length) ? 0 : bigBlindIndex + 1;
			console.log(bigBlindIndex);
			console.log(smallBlindIndex);
			for (let i = 0; i < this.players.length; i++) {
				if (i === bigBlindIndex) {
					this.players[i].setBlind('Big Blind');
				} else if (i === smallBlindIndex) {
					this.players[i].setBlind('Small Blind');
				} else {
					this.players[i].setBlind('');
				}
				this.players[i].setStatus('');
			}
			const goFirstIndex = (bigBlindIndex - 1 < 0) ? (this.players.length - 1) : bigBlindIndex - 1;
			this.roundData.bigBlind = bigBlindIndex;
			this.roundData.smallBlind = smallBlindIndex;
			this.roundData.turn = this.players[goFirstIndex].getUsername();
			this.players[goFirstIndex].setStatus('Their Turn');
			//preflop left of big blind and then other stages are small blind
			//then positions move to the left
		} else {
			bigBlindIndex = (this.roundData.bigBlind - 1 < 0) ? (this.players.length - 1) : this.roundData.bigBlind - 1;
			smallBlindIndex = (this.roundData.smallBlind - 1 < 0) ? (this.players.length - 1) : this.roundData.smallBlind - 1;
			for (let i = 0; i < this.players.length; i++) {
				if (i === bigBlindIndex) {
					this.players[i].setBlind('Big Blind');
				} else if (i === smallBlindIndex) {
					this.players[i].setBlind('Small Blind');
				} else {
					this.players[i].setBlind('');
				}
				this.players[i].setStatus('');
			}
			this.roundData.bigBlind = bigBlindIndex;
			this.roundData.smallBlind = smallBlindIndex;
			const goFirstIndex = (bigBlindIndex - 1 < 0) ? (this.players.length - 1) : bigBlindIndex - 1;
			this.roundData.turn = this.players[goFirstIndex].getUsername();
			this.players[goFirstIndex].setStatus('Their Turn');

		}
		// handle big and small blind initial forced bets
		if (this.players[bigBlindIndex].money == 0) {
			this.players[bigBlindIndex].setStatus('Bankrupt');
			this.roundData.bets.push([{ player: this.players[bigBlindIndex].getUsername(), bet: 'Buy-in' }]);
		} else {
			if (this.players[bigBlindIndex].money < 2) {
				this.players[bigBlindIndex].money = 0;
				this.players[bigBlindIndex].allIn = true;
				this.roundData.bets.push([{ player: this.players[bigBlindIndex].getUsername(), bet: 1 }]);
			} else {
				this.players[bigBlindIndex].money = this.players[bigBlindIndex].money - 2;
				this.roundData.bets.push([{ player: this.players[bigBlindIndex].getUsername(), bet: 2 }]);
			}
		}
		if (this.players[smallBlindIndex].money == 0) {
			this.players[smallBlindIndex].setStatus('Bankrupt');
		} else if (this.players[smallBlindIndex].money == 1) {
			this.players[smallBlindIndex].money = 0;
			this.roundData.bets[0].push({ player: this.players[smallBlindIndex].getUsername(), bet: 1 });
			this.players[smallBlindIndex].allIn = true;
		} else {
			this.players[smallBlindIndex].money = this.players[smallBlindIndex].money - 1;
			this.roundData.bets[0].push({ player: this.players[smallBlindIndex].getUsername(), bet: 1 });
		}

		this.roundNum++;
		this.rerender();
	};

	this.rerender = () => {
		let playersData = [];
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			playersData.push({ 'username': this.players[pn].getUsername(), 'status': this.players[pn].getStatus(), 'blind': this.players[pn].getBlind(), 'money': this.players[pn].getMoney() })
		}
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			this.players[pn].emit('rerender', { 'community': this.community, 'bets': this.roundData.bets, 'username': this.players[pn].getUsername(), 'round': this.roundNum, 'stage': this.getStageName(), 'pot': this.getCurrentPot(), 'players': playersData, 'myMoney': this.players[pn].getMoney(), 'myStatus': this.players[pn].getStatus(), 'myBlind': this.players[pn].getBlind() });
		}
	}

	this.getCurrentPot = () => {
		if (this.roundData.bets == undefined || this.roundData.bets.length == 0) return 0;
		else {
			let sum = 0;
			for (let i = 0; i < this.roundData.bets.length; i++) {
				sum += this.roundData.bets[i].reduce((acc, curr) => (curr.bet != 'Buy-in' && curr.bet != 'Fold') ? acc + curr.bet : acc + 0, 0);
			}
			return this.foldPot + sum;
		}
	}

	this.getCurrentMaxBet = () => {
		if (this.roundData.bets == undefined || this.roundData.bets.length == 0) return 0;
		else {
			return this.roundData.bets[this.roundData.bets.length - 1].reduce((acc, curr) => (curr.bet != 'Buy-in' && curr.bet != 'Fold') ? Math.max(acc, curr.bet) : acc, 0);
		}
	}


	this.getStageName = () => {
		if (this.roundData.bets.length == 1) {
			return 'Pre-Flop';
		} else if (this.roundData.bets.length == 2) {
			return 'Flop';
		} else if (this.roundData.bets.length == 3) {
			return 'Turn';
		} else if (this.roundData.bets.length == 4) {
			return 'River';
		} else {
			return 'Error';
		}
	}

	this.moveOntoNextPlayer = () => {
		console.log(this.roundData.bets[this.roundData.bets.length - 1]);
		if (this.isStageComplete()) {
			// stage-by-stage logic.
			// bigBlindWent = false;
			if (this.roundData.bets.length == 1) {
				this.community.push(this.deck.dealRandomCard());
				this.community.push(this.deck.dealRandomCard());
				this.community.push(this.deck.dealRandomCard());
				for (let i = 0; i < this.players.length; i++) {
					if (i === this.roundData.smallBlind) {
						this.players[i].setStatus('Their Turn');
					} else if (this.players[i].getStatus() !== 'Fold') {
						this.players[i].setStatus('');
					}
				}
				this.roundData.bets.push([]);
			} else if (this.roundData.bets.length == 2) {
				this.community.push(this.deck.dealRandomCard());
				for (let i = 0; i < this.players.length; i++) {
					if (i === this.roundData.smallBlind) {
						this.players[i].setStatus('Their Turn');
					} else if (this.players[i].getStatus() !== 'Fold') {
						this.players[i].setStatus('');
					}
				}
				this.roundData.bets.push([]);
			} else if (this.roundData.bets.length == 3) {
				this.community.push(this.deck.dealRandomCard());
				for (let i = 0; i < this.players.length; i++) {
					if (i === this.roundData.smallBlind) {
						this.players[i].setStatus('Their Turn');
					} else if (this.players[i].getStatus() !== 'Fold') {
						this.players[i].setStatus('');
					}
				}
				this.roundData.bets.push([]);
			} else if (this.roundData.bets.length == 4) {
				// TODO poker hand winner logic
				this.revealCards();
			} else {
				console.log('This stage of the round is INVALID!!');
			}
		} else {
			//check if everyone folded except one player
			let numNonFolds = 0;
			let nonFolderPlayer;
			for (let i = 0; i < this.getNumPlayers(); i++) {
				if (this.players[i].getStatus() != 'Fold') {
					numNonFolds++;
					nonFolderPlayer = this.players[i];
				}
			}
			console.log('number of non folds:' + numNonFolds);
			if (numNonFolds == 1) {
				// everyone folded, start new round, give pot to player
				console.log('everyone folded except one');
				nonFolderPlayer.money = this.getCurrentPot() + nonFolderPlayer.money;
				this.startNewRound();
			} else {
				let currTurnIndex = 0;
				for (let i = 0; i < this.players.length; i++) {
					if (this.players[i].getStatus() == 'Their Turn') {
						currTurnIndex = i;
						this.players[i].setStatus('');
					}
				}
				do {
					currTurnIndex = (currTurnIndex - 1 < 0) ? (this.players.length - 1) : (currTurnIndex - 1)
				} while (this.players[currTurnIndex].getStatus() == 'Fold');
				this.players[currTurnIndex].setStatus('Their Turn');
			}
		}
		this.rerender();
	}

	this.revealCards = () => {
		console.log('revealllllll');
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			this.emitPlayers('reveal', { 'username': this.players[pn].getUsername(), 'cards': this.players[pn].cards });
		}
	}

	this.isStageComplete = () => {
		const maxBet = this.getCurrentMaxBet();
		let allPlayersPresent = false;
		let numUnfolded = 0;
		for (let i = 0; i < this.players.length; i++) {
			if (this.players[i].status != 'Fold') numUnfolded++;
		}
		if (this.roundData.bets.length == 1) {
			allPlayersPresent = (this.roundData.bets[this.roundData.bets.length - 1].length == numUnfolded) && this.bigBlindWent;
		} else {
			allPlayersPresent = this.roundData.bets[this.roundData.bets.length - 1].length == numUnfolded;
		}

		return allPlayersPresent && this.roundData.bets[this.roundData.bets.length - 1].reduce((acc, curr) => ((curr.bet != 'Buy-in' && curr.bet != 'Fold') ? (curr.bet == maxBet) : true) && acc, true);
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

			this.players[pn].emit("dealt", { 'currBet': this.getCurrentMaxBet(), 'username': this.players[pn].getUsername(), 'cards': this.players[pn].cards, 'players': this.players.map((p) => { return p.username; }) });
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
		return { socket: { id: 0 } };
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