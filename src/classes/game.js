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
	this.lastMoveParsed = { 'move': '', 'player': '' };
	this.roundInProgress = false;
	this.disconnectedPlayers = [];

	const constructor = function () {
	}(this);

	this.startNewRound = () => {
		this.lastMoveParsed = { 'move': '', 'player': '' };
		this.roundInProgress = true;
		this.foldPot = 0;
		this.bigBlindWent = false;
		let bigBlindIndex, smallBlindIndex;
		this.community = [];
		this.roundData.turn = '';
		this.roundData.bets = [];
		this.dealCards();
		console.log('deck len' + this.deck.cards.length);
		for (pn of this.players) {
			pn.allIn = false;
		}
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
		for (player of this.players) {
			if (player.getMoney() == 0) {
				player.money = 100;
				player.buyIns = player.buyIns + 1;
			}
		}

		// handle big and small blind initial forced bets

		if (this.players[bigBlindIndex].money < 2) {
			this.players[bigBlindIndex].money = 0;
			this.players[bigBlindIndex].allIn = true;
			this.roundData.bets.push([{ player: this.players[bigBlindIndex].getUsername(), bet: 1 }]);
		} else {
			this.players[bigBlindIndex].money = this.players[bigBlindIndex].money - 2;
			this.roundData.bets.push([{ player: this.players[bigBlindIndex].getUsername(), bet: 2 }]);
		}

		if (this.players[smallBlindIndex].money == 1) {
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
			playersData.push({
				'username': this.players[pn].getUsername(),
				'status': this.players[pn].getStatus(),
				'blind': this.players[pn].getBlind(),
				'money': this.players[pn].getMoney(),
				'buyIns': this.players[pn].buyIns
			})
		}
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			this.players[pn].emit('rerender', {
				'community': this.community,
				'topBet': this.getCurrentTopBet(),
				'bets': this.roundData.bets,
				'username': this.players[pn].getUsername(),
				'round': this.roundNum,
				'stage': this.getStageName(),
				'pot': this.getCurrentPot(),
				'players': playersData,
				'myMoney': this.players[pn].getMoney(),
				'myBet': this.getPlayerBetInStage(this.players[pn]),
				'myStatus': this.players[pn].getStatus(),
				'myBlind': this.players[pn].getBlind(),
				'roundInProgress': this.roundInProgress,
				'buyIns': this.players[pn].buyIns
			});
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

	this.getPlayerBetInStage = (player) => {
		if (this.roundData.bets == undefined || this.roundData.bets.length == 0 ||
			this.roundData.bets[this.roundData.bets.length - 1] == undefined) return 0;
		const stageData = this.roundData.bets[this.roundData.bets.length - 1];
		let totalBetInStage = 0;

		for (let j = 0; j < stageData.length; j++) {
			if (stageData[j].player == player.getUsername() && stageData[j].bet != 'Buy-in' && stageData[j].bet != 'Fold') {
				totalBetInStage += stageData[j].bet;
				break;
			}
		}
		return totalBetInStage;
	}

	this.getCurrentTopBet = () => {
		if (this.roundData.bets == undefined || this.roundData.bets.length == 0) return 0;
		else {
			let maxBet = 0;
			for (let i = 0; i < this.players.length; i++) {
				maxBet = Math.max(maxBet, this.getPlayerBetInStage(this.players[i]));
			}
			return maxBet;
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

	this.findFirstToGoPlayer = () => {
		if (this.players[this.roundData.smallBlind].getStatus() == 'Fold') {
			let index = this.roundData.smallBlind;
			do {
				index = (index - 1 < 0) ? (this.players.length - 1) : index - 1;
			} while (this.players[index].getStatus() == 'Fold');
			return index;
		} else {
			return this.roundData.smallBlind;
		}
	}

	this.moveOntoNextPlayer = () => {
		let handOver = false;
		console.log(this.roundData.bets[this.roundData.bets.length - 1]);
		if (this.isStageComplete()) {
			console.log('stage complete');
			if (this.allPlayersAllIn()) {
				console.log(' all players all in');
				if (this.roundData.bets.length == 1) {
					this.community.push(this.deck.dealRandomCard());
					this.community.push(this.deck.dealRandomCard());
					this.community.push(this.deck.dealRandomCard());
					this.roundData.bets.push([]);
				}
				if (this.roundData.bets.length == 2) {
					this.community.push(this.deck.dealRandomCard());
					this.roundData.bets.push([]);
				}
				if (this.roundData.bets.length == 3) {
					this.community.push(this.deck.dealRandomCard());
					this.roundData.bets.push([]);
				}
				this.rerender();
			}
			// stage-by-stage logic.
			// check if everyone folded but one
			let numNonFolds = 0;
			let nonFolderPlayer;
			for (let i = 0; i < this.getNumPlayers(); i++) {
				if (this.players[i].getStatus() != 'Fold') {
					numNonFolds++;
					nonFolderPlayer = this.players[i];
				}
			}
			if (numNonFolds == 1) {
				// everyone folded, start new round, give pot to player
				console.log('everyone folded except one');
				nonFolderPlayer.money = this.getCurrentPot() + nonFolderPlayer.money;
				this.endHandAllFold(nonFolderPlayer.getUsername());
				handOver = true;
			} else {
				if (this.roundData.bets.length == 1) {
					this.community.push(this.deck.dealRandomCard());
					this.community.push(this.deck.dealRandomCard());
					this.community.push(this.deck.dealRandomCard());
					for (let i = 0; i < this.players.length; i++) {
						if (i === this.findFirstToGoPlayer() && this.players[i].getStatus() !== 'Fold') {
							this.players[i].setStatus('Their Turn');
						} else if (this.players[i].getStatus() !== 'Fold') {
							this.players[i].setStatus('');
						}
					}
					this.roundData.bets.push([]);
				} else if (this.roundData.bets.length == 2) {
					this.community.push(this.deck.dealRandomCard());
					for (let i = 0; i < this.players.length; i++) {
						if (i === this.findFirstToGoPlayer() && this.players[i].getStatus() !== 'Fold') {
							this.players[i].setStatus('Their Turn');
						} else if (this.players[i].getStatus() !== 'Fold') {
							this.players[i].setStatus('');
						}
					}
					this.roundData.bets.push([]);
				} else if (this.roundData.bets.length == 3) {
					this.community.push(this.deck.dealRandomCard());
					for (let i = 0; i < this.players.length; i++) {
						if (i === this.findFirstToGoPlayer() && this.players[i].getStatus() !== 'Fold') {
							this.players[i].setStatus('Their Turn');
						} else if (this.players[i].getStatus() !== 'Fold') {
							this.players[i].setStatus('');
						}
					}
					this.roundData.bets.push([]);
				} else if (this.roundData.bets.length == 4) {
					handOver = true;
					const roundResults = this.evaluateWinners();
					for (playerResult of roundResults.playersData) {
						playerResult.player.setStatus(playerResult.hand.name);
					}
					let winningPlayers = [];
					for (winner of roundResults.winnerData) {
						winningPlayers.push(winner.player);
					}
					this.distributeMoney(winningPlayers);
					this.revealCards(winningPlayers.map(a => a.getUsername()));

				} else {
					console.log('This stage of the round is INVALID!!');
				}
			}
		} else {
			console.log('stage not complete');
			//check if everyone folded except one player
			let numNonFolds = 0;
			let nonFolderPlayer;
			for (let i = 0; i < this.getNumPlayers(); i++) {
				if (this.players[i].getStatus() != 'Fold') {
					numNonFolds++;
					nonFolderPlayer = this.players[i];
				}
			}
			if (!handOver && numNonFolds == 1) {
				// everyone folded, start new round, give pot to player
				console.log('everyone folded except one');
				nonFolderPlayer.money = this.getCurrentPot() + nonFolderPlayer.money;
				this.endHandAllFold(nonFolderPlayer.getUsername());
				handOver = true;
			} else {
				let currTurnIndex = 0;
				//check if move just made was a fold
				if (this.lastMoveParsed.move == 'Fold') {
					for (let i = 0; i < this.players.length; i++) {
						if (this.players[i].username == this.lastMoveParsed.player.username) {
							currTurnIndex = i;
							break;
						}
					}
					this.lastMoveParsed = { 'move': '', 'player': '' };
				} else {
					for (let i = 0; i < this.players.length; i++) {
						if (this.players[i].getStatus() == 'Their Turn') {
							currTurnIndex = i;
							this.players[i].setStatus('');
						}
					}
				}
				do {
					currTurnIndex = (currTurnIndex - 1 < 0) ? (this.players.length - 1) : (currTurnIndex - 1)
				} while (this.players[currTurnIndex].getStatus() == 'Fold' || this.players[currTurnIndex].allIn);
				this.players[currTurnIndex].setStatus('Their Turn');
			}
		}
		if (!handOver) {
			console.log('RERENDERING');
			this.rerender();
		}
	}

	this.getPlayerBetInStageNum = (player, stageNum) => {
		if (this.roundData.bets == undefined || this.roundData.bets.length == 0 ||
			this.roundData.bets[stageNum - 1] == undefined) return 0;
		const stageData = this.roundData.bets[stageNum - 1];
		let totalBetInStage = 0;

		for (let j = 0; j < stageData.length; j++) {
			if (stageData[j].player == player.getUsername() && stageData[j].bet != 'Buy-in' && stageData[j].bet != 'Fold')
				totalBetInStage += stageData[j].bet;
		}
		return totalBetInStage;
	}

	this.getTotalBetsInStageNum = (stageNum) => {
		if (this.roundData.bets == undefined || this.roundData.bets.length == 0 ||
			this.roundData.bets[stageNum - 1] == undefined) return 0;
		const stageData = this.roundData.bets[stageNum - 1];
		let totalBetInStage = 0;

		for (let j = 0; j < stageData.length; j++) {
			if (stageData[j].bet != 'Buy-in' && stageData[j].bet != 'Fold')
				totalBetInStage += stageData[j].bet;
		}
		return totalBetInStage;
	}

	this.distributeMoney = (winners) => {
		const numWinners = winners.length;
		const potTotal = this.getCurrentPot();
		const potEligible = Math.floor(potTotal / numWinners);
		for (winner of winners) {
			if (winner.allIn || winner.getMoney() == 0) {
				// calculate what all-in player is eligible for (side pot calculation).
				// returns money to players
				let sidepot1 = [];
				let sidepot2 = [];
				let sidepot3 = [];
				let sidepot4 = [];
				for (let i = 0; i < 4; i++) {
					this.roundData.bets[i] = this.roundData.bets[i].filter(a => typeof a.bet === 'number');
					this.roundData.bets[i].sort((a, b) => a.bet - b.bet);
				}
				for (let i = 0; i < this.roundData.bets[0].length; i++) {
					if (sidepot1.some(a => this.roundData.bets[0][i].bet == a.bet)) {
						for (let j = 0; j < sidepot1.length; j++) {
							if (sidepot1[j].bet == this.roundData.bets[0][i].bet) {
								let pot = sidepot1[j];
								pot.players.push(this.roundData.bets[0][i].player);
								sidepot1[j] = pot;
							}
						}
					} else {
						sidepot1.push({ bet: this.roundData.bets[0][i].bet, players: [this.roundData.bets[0][i].player] })
					}
				}
				for (let i = 0; i < this.roundData.bets[1].length; i++) {
					if (sidepot2.some(a => this.roundData.bets[1][i].bet == a.bet)) {
						for (let j = 0; j < sidepot2.length; j++) {
							if (sidepot2[j].bet == this.roundData.bets[1][i].bet) {
								let pot = sidepot2[j];
								pot.players.push(this.roundData.bets[1][i].player);
								sidepot2[j] = pot;
							}
						}
					} else {
						sidepot2.push({ bet: this.roundData.bets[1][i].bet, players: [this.roundData.bets[1][i].player] })
					}
				}
				for (let i = 0; i < this.roundData.bets[2].length; i++) {
					if (sidepot3.some(a => this.roundData.bets[2][i].bet == a.bet)) {
						for (let j = 0; j < sidepot3.length; j++) {
							if (sidepot3[j].bet == this.roundData.bets[2][i].bet) {
								let pot = sidepot3[j];
								pot.players.push(this.roundData.bets[2][i].player);
								sidepot3[j] = pot;
							}
						}
					} else {
						sidepot3.push({ bet: this.roundData.bets[2][i].bet, players: [this.roundData.bets[2][i].player] })
					}
				}
				for (let i = 0; i < this.roundData.bets[3].length; i++) {
					if (sidepot4.some(a => this.roundData.bets[3][i].bet == a.bet)) {
						for (let j = 0; j < sidepot3.length; j++) {
							if (sidepot4[j].bet == this.roundData.bets[3][i].bet) {
								let pot = sidepot4[j];
								pot.players.push(this.roundData.bets[3][i].player);
								sidepot4[j] = pot;
							}
						}
					} else {
						sidepot4.push({ bet: this.roundData.bets[3][i].bet, players: [this.roundData.bets[3][i].player] })
					}
				}
				console.log('sidepot 1 ' + JSON.stringify(sidepot1));
				console.log('sidepot 2 ' + JSON.stringify(sidepot2));
				console.log('sidepot 3 ' + JSON.stringify(sidepot3));
				console.log('sidepot 4 ' + JSON.stringify(sidepot4));
				let winnings = 0;
				//NOTE: does not handle more than two winners correctly yet
				for (pot of sidepot1) {
					if (pot.players.includes(winner.getUsername())) {
						if (winners.length == 1)
							winnings += pot.bet * pot.players.length;
						else {
							if (pot.players.includes(winners[1].getUsername()) || (winners.length == 3 && pot.players.includes(winners[2].getUsername()))) {
								winnings += (pot.bet * pot.players.length) / winners.length;
							}
						}
					} else {
						for (player of pot.players) {
							//return money
							let playerObj = this.players.find(a => a.getUsername() == player);
							if (playerObj == undefined) { console.log('yikes'); break; }
							if (winners.length == 1)
								playerObj.money = playerObj.money + Math.floor(pot.bet / pot.players.length);
							else {
								if (pot.players.includes(winners[1].getUsername()) || (winners.length == 3 && pot.players.includes(winners[2].getUsername())))
									playerObj.money = playerObj.money + Math.floor((pot.bet / pot.players.length) / winners.length);
							}
						}
					}
				}
				for (pot of sidepot2) {
					if (pot.players.includes(winner.getUsername())) {
						if (winners.length == 1)
							winnings += pot.bet * pot.players.length;
						else {
							if (pot.players.includes(winners[1].getUsername()) || (winners.length == 3 && pot.players.includes(winners[2].getUsername()))) {
								winnings += (pot.bet * pot.players.length) / winners.length;
							}
						}
					} else {
						for (player of pot.players) {
							//return money
							let playerObj = this.players.find(a => a.getUsername() == player);
							if (playerObj == undefined) { console.log('yikes'); break; }
							if (winners.length == 1)
								playerObj.money = playerObj.money + Math.floor(pot.bet / pot.players.length);
							else {
								if (pot.players.includes(winners[1].getUsername()) || (winners.length == 3 && pot.players.includes(winners[2].getUsername())))
									playerObj.money = playerObj.money + Math.floor((pot.bet / pot.players.length) / winners.length);
							}
						}
					}
				}
				for (pot of sidepot3) {
					if (pot.players.includes(winner.getUsername())) {
						if (winners.length == 1)
							winnings += pot.bet * pot.players.length;
						else {
							if (pot.players.includes(winners[1].getUsername()) || (winners.length == 3 && pot.players.includes(winners[2].getUsername()))) {
								winnings += (pot.bet * pot.players.length) / winners.length;
							}
						}
					} else {
						for (player of pot.players) {
							//return money
							let playerObj = this.players.find(a => a.getUsername() == player);
							if (playerObj == undefined) { console.log('yikes'); break; }
							if (winners.length == 1)
								playerObj.money = playerObj.money + Math.floor(pot.bet / pot.players.length);
							else {
								if (pot.players.includes(winners[1].getUsername()) || (winners.length == 3 && pot.players.includes(winners[2].getUsername())))
									playerObj.money = playerObj.money + Math.floor((pot.bet / pot.players.length) / winners.length);
							}
						}
					}
				}
				for (pot of sidepot4) {
					if (pot.players.includes(winner.getUsername())) {
						if (winners.length == 1)
							winnings += pot.bet * pot.players.length;
						else {
							if (pot.players.includes(winners[1].getUsername()) || (winners.length == 3 && pot.players.includes(winners[2].getUsername()))) {
								winnings += (pot.bet * pot.players.length) / winners.length;
							}
						}
					} else {
						for (player of pot.players) {
							//return money
							let playerObj = this.players.find(a => a.getUsername() == player);
							if (playerObj == undefined) { console.log('yikes'); break; }
							if (winners.length == 1)
								playerObj.money = playerObj.money + Math.floor(pot.bet / pot.players.length);
							else {
								if (pot.players.includes(winners[1].getUsername()) || (winners.length == 3 && pot.players.includes(winners[2].getUsername())))
									playerObj.money = playerObj.money + Math.floor((pot.bet / pot.players.length) / winners.length);
							}
						}
					}
				}
				winner.money = winner.money + winnings;
			} else {
				winner.money = winner.money + potEligible;
			}
		}
	}

	this.evaluateWinners = () => {
		let handArray = [];
		let playerArray = [];
		for (let i = 0; i < this.players.length; i++) {
			if (this.players[i].getStatus() != 'Fold') {
				let h = Hand.solve(this.convertCardsFormat(this.players[i].cards.concat(this.community)));
				handArray.push(h);
				playerArray.push({ player: this.players[i], hand: h });
			}
		}
		const winners = Hand.winners(handArray);

		let winnerData = [];
		if (Array.isArray(winners)) {
			for (winner of winners) {
				for (playerHand of playerArray) {
					let winnerArray = winner.toString().split(', ');
					if (this.arraysEqual(playerHand.hand.cards.sort(), winnerArray.sort())) {
						winnerData.push({ player: playerHand.player, handTitle: playerHand.hand.name });
						break;
					}
				}
			}
		} else {
			console.log('fatal error: winner cannot be calculated');
		}
		const res = { winnerData: winnerData, playersData: playerArray };
		return res;
	}

	this.arraysEqual = (a, b) => {
		if (a === b) return true;
		if (a == null || b == null) return false;
		if (a.length != b.length) return false;

		for (let i = 0; i < a.length; ++i) {
			if (a[i] != b[i]) return false;
		}
		return true;
	}

	this.convertCardsFormat = (arr) => {
		let res = [];
		for (let i = 0; i < arr.length; i++) {
			let str = '';
			let value = arr[i].getValue();
			let suit = arr[i].getSuit();
			if (value == 10) {
				str += 'T';
			} else {
				str += value.toString();
			}
			if (suit == '♠') str += 's';
			else if (suit == '♥') str += 'h';
			else if (suit == '♦') str += 'd';
			else if (suit == '♣') str += 'c';
			res.push(str);
		}
		return res;
	}

	this.endHandAllFold = (username) => {
		console.log('endhandallfold' + this.players);
		this.roundInProgress = false;
		let cardData = [];
		for (let i = 0; i < this.players.length; i++) {
			cardData.push({
				'username': this.players[i].getUsername(),
				'money': this.players[i].getMoney(),
				'text': this.players[i].getStatus()
			});
		}
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			this.players[pn].emit('endHand', {
				'winner': username,
				'folded': (this.players[pn].getUsername() != username ? 'Fold' : ''),
				'username': this.players[pn].getUsername(),
				'pot': this.getCurrentPot(),
				'money': this.players[pn].getMoney(),
				'cards': cardData,
				'bets': this.roundData.bets,
			});
		}
	}

	this.revealCards = (winnersUsernames) => {
		console.log('revealllllll');
		this.roundInProgress = false;
		let cardData = [];
		for (let i = 0; i < this.players.length; i++) {
			cardData.push({
				'username': this.players[i].getUsername(),
				'cards': this.players[i].cards,
				'hand': this.players[i].getStatus(),
				'folded': this.players[i].getStatus() == 'Fold',
				'money': this.players[i].getMoney(),
				'buyIns': this.players[i].buyIns
			});
		}
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			this.players[pn].emit('reveal', {
				'username': this.players[pn].getUsername(),
				'money': this.players[pn].getMoney(),
				'cards': cardData,
				'bets': this.roundData.bets,
				'winners': winnersUsernames.toString(),
				'hand': this.players[pn].getStatus()
			});
		}
	}

	this.allPlayersAllIn = () => {
		let participatingPlayers = 0;
		for (player of this.players) {
			if (!player.allIn && player.getStatus() != 'Fold') participatingPlayers++;
		}
		return participatingPlayers <= 1;
	}

	this.isStageComplete = () => {
		let allPlayersPresent = false;
		let numUnfolded = 0;
		for (let i = 0; i < this.players.length; i++) {
			if (this.players[i].status != 'Fold') numUnfolded++;
		}
		const currRound = this.roundData.bets[this.roundData.bets.length - 1];
		if (this.roundData.bets.length == 1) {
			allPlayersPresent = (currRound.filter(a => a.bet != 'Fold').length >= numUnfolded) && this.bigBlindWent;
		} else {
			allPlayersPresent = currRound.filter(a => a.bet != 'Fold').length >= numUnfolded;
		}
		console.log('all players present ' + allPlayersPresent);
		let allPlayersCall = true;
		for (player of this.players) {
			if (player.getStatus() != 'Fold' && this.getPlayerBetInStage(player) != this.getCurrentTopBet() && !player.allIn) {
				allPlayersCall = false;
				break;
			}
		}
		console.log('all players call ' + allPlayersCall);
		return allPlayersPresent && allPlayersCall;
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
		this.deck.shuffle();
		for (let pn = 0; pn < this.getNumPlayers(); pn++) {
			this.players[pn].cards = [];
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

			this.players[pn].emit("dealt", { 'currBet': this.getCurrentTopBet(), 'username': this.players[pn].getUsername(), 'cards': this.players[pn].cards, 'players': this.players.map((p) => { return p.username; }) });
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

	this.disconnectPlayer = (player) => {
		this.disconnectedPlayers.push(player);
		this.players = this.players.filter(a => a != player);
		if (player == this.host) {
			if (this.players.length > 0) {
				this.host = this.players[0].getUsername();
			}
		}
		this.emitPlayers('playerDisconnected', { 'player': player.getUsername() });
		if (player.getStatus() == 'Their Turn') {
			this.moveOntoNextPlayer();
		}
		this.emitPlayers('joinRoomUpdate', { 'players': this.getPlayersArray(), 'code': this.getCode() });
		this.emitPlayers('hostRoomUpdate', { 'players': this.getPlayersArray() });
		this.rerender();
	}

};

module.exports = Game;