// server-side game logic for a texas hold 'em game
const Deck = require('./deck.js');
const Player = require('./player.js');
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
  this.roundData = {
    dealer: 0,
    bigBlind: '',
    smallBlind: '',
    turn: '',
    bets: [],
  };
  this.community = [];
  this.foldPot = 0;
  this.bigBlindWent = false;
  this.lastMoveParsed = { move: '', player: '' };
  this.roundInProgress = false;
  this.disconnectedPlayers = [];
  this.autoBuyIns = true;
  this.debug = false;
  this.smallBlind = 1;
  this.bigBlind = 2;

  const constructor = (function () {})(this);

  this.log = () => {
    if (this.debug) {
      console.log(...arguments);
    }
  };

  this.assignBlind = () => {
    this.roundData.smallBlind =
      this.roundData.dealer + 1 < this.players.length
        ? this.roundData.dealer + 1
        : 0;
    this.roundData.bigBlind =
      this.roundData.smallBlind + 1 < this.players.length
        ? this.roundData.smallBlind + 1
        : 0;

    this.log('smallBlind: ' + this.roundData.smallBlind);
    this.log('bigBlind: ' + this.roundData.bigBlind);

    for (let i = 0; i < this.players.length; i++) {
      this.players[i].setDealer(i === this.roundData.dealer);
      if (i === this.roundData.bigBlind) {
        this.players[i].setBlind('Big Blind');
      } else if (i === this.roundData.smallBlind) {
        this.players[i].setBlind('Small Blind');
      } else {
        this.players[i].setBlind('');
      }
      this.players[i].setStatus('');
    }

    const goFirstIndex =
      this.roundData.bigBlind - 1 < 0
        ? this.players.length - 1
        : this.roundData.bigBlind - 1;
    this.roundData.turn = this.players[goFirstIndex].getUsername();
    this.players[goFirstIndex].setStatus('Their Turn');
  };

  this.startNewRound = () => {
    this.lastMoveParsed = { move: '', player: '' };
    this.roundInProgress = true;
    this.foldPot = 0;
    this.bigBlindWent = false;
    this.community = [];
    this.roundData.turn = '';
    this.roundData.bets = [];
    this.dealCards();
    this.log('deck len' + this.deck.cards.length);
    for (pn of this.players) {
      pn.allIn = false;
    }

    // Init dealer
    if (this.roundNum == 0) {
      this.roundData.dealer = 0;
    } else {
      this.roundData.dealer =
        this.roundData.dealer + 1 < this.players.length
          ? this.roundData.dealer + 1
          : 0;
    }
    // Init blind and first player
    this.assignBlind();

    if (this.autoBuyIns) {
      for (player of this.players) {
        if (player.getMoney() == 0) {
          player.money = 100;
          player.buyIns = player.buyIns + 1;
        }
      }
    }

    // handle big and small blind initial forced bets

    if (this.players[this.roundData.bigBlind].money < this.bigBlind) {
      this.players[this.roundData.bigBlind].money = 0;
      this.players[this.roundData.bigBlind].allIn = true;
      this.roundData.bets.push([
        {
          player: this.players[this.roundData.bigBlind].getUsername(),
          bet: this.bigBlind - this.players[this.roundData.bigBlind].money,
        },
      ]);
    } else {
      this.players[this.roundData.bigBlind].money =
        this.players[this.roundData.bigBlind].money - this.bigBlind;
      this.roundData.bets.push([
        {
          player: this.players[this.roundData.bigBlind].getUsername(),
          bet: this.bigBlind,
        },
      ]);
    }

    if (this.players[this.roundData.smallBlind].money == this.smallBlind) {
      this.players[this.roundData.smallBlind].money = 0;
      this.roundData.bets[0].push({
        player: this.players[this.roundData.smallBlind].getUsername(),
        bet: this.smallBlind - this.players[this.roundData.bigBlind].money,
      });
      this.players[this.roundData.smallBlind].allIn = true;
    } else {
      this.players[this.roundData.smallBlind].money =
        this.players[this.roundData.smallBlind].money - this.smallBlind;
      this.roundData.bets[0].push({
        player: this.players[this.roundData.smallBlind].getUsername(),
        bet: this.smallBlind,
      });
    }

    this.roundNum++;
    this.rerender();
  };

  this.rerender = () => {
    let playersData = [];
    for (let pn = 0; pn < this.getNumPlayers(); pn++) {
      playersData.push({
        username: this.players[pn].getUsername(),
        status: this.players[pn].getStatus(),
        blind: this.players[pn].getBlind(),
        money: this.players[pn].getMoney(),
        buyIns: this.players[pn].buyIns,
        isChecked: this.playerIsChecked(this.players[pn]),
      });
    }
    for (let pn = 0; pn < this.getNumPlayers(); pn++) {
      this.players[pn].emit('rerender', {
        community: this.community,
        topBet: this.getCurrentTopBet(),
        bets: this.roundData.bets,
        username: this.players[pn].getUsername(),
        round: this.roundNum,
        stage: this.getStageName(),
        pot: this.getCurrentPot(),
        players: playersData,
        myMoney: this.players[pn].getMoney(),
        myBet: this.getPlayerBetInStage(this.players[pn]),
        myStatus: this.players[pn].getStatus(),
        myBlind: this.players[pn].getBlind(),
        roundInProgress: this.roundInProgress,
        buyIns: this.players[pn].buyIns,
      });
    }
  };

  this.getCurrentPot = () => {
    if (this.roundData.bets == undefined || this.roundData.bets.length == 0)
      return 0;
    else {
      let sum = 0;
      for (let i = 0; i < this.roundData.bets.length; i++) {
        sum += this.roundData.bets[i].reduce(
          (acc, curr) =>
            curr.bet != 'Buy-in' && curr.bet != 'Fold'
              ? acc + curr.bet
              : acc + 0,
          0
        );
      }
      return this.foldPot + sum;
    }
  };

  this.getPlayerBetInStage = (player) => {
    if (
      this.roundData.bets == undefined ||
      this.roundData.bets.length == 0 ||
      this.getCurrentRoundBets() == undefined
    )
      return 0;
    const stageData = this.getCurrentRoundBets();
    let totalBetInStage = 0;

    for (let j = 0; j < stageData.length; j++) {
      if (
        stageData[j].player == player.getUsername() &&
        stageData[j].bet != 'Buy-in' &&
        stageData[j].bet != 'Fold'
      ) {
        totalBetInStage += stageData[j].bet;
        break;
      }
    }
    return totalBetInStage;
  };

  this.getCurrentTopBet = () => {
    if (this.roundData.bets == undefined || this.roundData.bets.length == 0)
      return 0;
    else {
      let maxBet = 0;
      for (let i = 0; i < this.players.length; i++) {
        maxBet = Math.max(maxBet, this.getPlayerBetInStage(this.players[i]));
      }
      return maxBet;
    }
  };

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
  };

  this.playerIsChecked = (playr) => {
    if (this.roundData.bets) {
      const bets = this.getCurrentRoundBets() || [];
      return bets.some((a) => a.player == playr.getUsername() && a.bet == 0);
    }
  };

  this.findFirstToGoPlayer = () => {
    if (
      !this.players[this.roundData.smallBlind] ||
      this.players[this.roundData.smallBlind].getStatus() == 'Fold' ||
      this.players[this.roundData.smallBlind].allIn
    ) {
      let index = this.roundData.smallBlind;
      do {
        index = index - 1 < 0 ? this.players.length - 1 : index - 1;
      } while (
        this.players[index].getStatus() == 'Fold' ||
        this.players[index].allIn
      );
      return index;
    } else {
      return this.roundData.smallBlind;
    }
  };

  this.getNonFoldedPlayer = () => {
    let numNonFolds = 0;
    let nonFolderPlayer;
    for (let i = 0; i < this.getNumPlayers(); i++) {
      if (this.players[i].getStatus() != 'Fold') {
        numNonFolds++;
        nonFolderPlayer = this.players[i];
      }
    }
    return [numNonFolds, nonFolderPlayer];
  };

  this.updateStage = () => {
    for (let i = 0; i < this.players.length; i++) {
      if (
        i === this.findFirstToGoPlayer() &&
        this.players[i].getStatus() !== 'Fold'
      ) {
        this.players[i].setStatus('Their Turn');
      } else if (this.players[i].getStatus() !== 'Fold') {
        this.players[i].setStatus('');
      }
    }
    this.roundData.bets.push([]);
  };

  this.moveOntoNextPlayer = () => {
    let handOver = false;
    if (this.isStageComplete()) {
      this.log('stage complete');
      if (this.allPlayersAllIn()) {
        this.log(' all players all in');
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
      const [numNonFolds, nonFolderPlayer] = this.getNonFoldedPlayer();
      if (numNonFolds == 1) {
        // everyone folded, start new round, give pot to player
        this.log('everyone folded except one');
        nonFolderPlayer.money = this.getCurrentPot() + nonFolderPlayer.money;
        this.endHandAllFold(nonFolderPlayer.getUsername());
        handOver = true;
      } else {
        if (this.roundData.bets.length == 1) {
          this.community.push(this.deck.dealRandomCard());
          this.community.push(this.deck.dealRandomCard());
          this.community.push(this.deck.dealRandomCard());
          this.updateStage();
        } else if (this.roundData.bets.length == 2) {
          this.community.push(this.deck.dealRandomCard());
          this.updateStage();
        } else if (this.roundData.bets.length == 3) {
          this.community.push(this.deck.dealRandomCard());
          this.updateStage();
        } else if (this.roundData.bets.length == 4) {
          handOver = true;
          const roundResults = this.evaluateWinners();
          for (playerResult of roundResults.playersData) {
            playerResult.player.setStatus(playerResult.hand.name);
          }
          const winningData = this.distributeMoney(roundResults);
          this.revealCards(winningData.filter((a) => a.winner));
        } else {
          this.log('This stage of the round is INVALID!!');
        }
      }
    } else {
      this.log('stage not complete');
      //check if everyone folded except one player
      const [numNonFolds, nonFolderPlayer] = this.getNonFoldedPlayer();
      if (!handOver && numNonFolds == 1) {
        // everyone folded, start new round, give pot to player
        this.log('everyone folded except one');
        nonFolderPlayer.money = this.getCurrentPot() + nonFolderPlayer.money;
        this.endHandAllFold(nonFolderPlayer.getUsername());
        handOver = true;
      } else {
        let currTurnIndex = 0;
        //check if move just made was a fold
        if (this.lastMoveParsed.move == 'Fold') {
          currTurnIndex = this.players.findIndex(
            (p) => p === this.lastMoveParsed.player
          );
          this.lastMoveParsed = { move: '', player: '' };
        } else {
          currTurnIndex = this.players.findIndex(
            (p) => p.getStatus() === 'Their Turn'
          );
          this.players[currTurnIndex].setStatus('');
        }
        let count = 0;
        do {
          currTurnIndex = currTurnIndex - 1 < 0 ? this.players.length - 1 : currTurnIndex - 1;
          count ++;
        } while (
          (this.players[currTurnIndex].getStatus() == 'Fold'
          || this.players[currTurnIndex].allIn)
          && count < Object.keys(this.players).length * 2 // Avoid infinite loop, allow search twice on all players
        );
        this.players[currTurnIndex].setStatus('Their Turn');
      }
    }
    if (!handOver) {
      this.log('RERENDERING');
      this.rerender();
    }
  };

  this.getPlayerBetInStageNum = (player, stageNum) => {
    if (
      this.roundData.bets == undefined ||
      this.roundData.bets.length == 0 ||
      this.roundData.bets[stageNum - 1] == undefined
    )
      return 0;
    const stageData = this.roundData.bets[stageNum - 1];
    let totalBetInStage = 0;

    for (let j = 0; j < stageData.length; j++) {
      if (
        stageData[j].player == player.getUsername() &&
        stageData[j].bet != 'Buy-in' &&
        stageData[j].bet != 'Fold'
      )
        totalBetInStage += stageData[j].bet;
    }
    return totalBetInStage;
  };

  this.getTotalBetsInStageNum = (stageNum) => {
    if (
      this.roundData.bets == undefined ||
      this.roundData.bets.length == 0 ||
      this.roundData.bets[stageNum - 1] == undefined
    )
      return 0;
    const stageData = this.roundData.bets[stageNum - 1];
    let totalBetInStage = 0;

    for (let j = 0; j < stageData.length; j++) {
      if (stageData[j].bet != 'Buy-in' && stageData[j].bet != 'Fold')
        totalBetInStage += stageData[j].bet;
    }
    return totalBetInStage;
  };

  this.getTotalInvested = (player) => {
    return (
      this.getPlayerBetInStageNum(player, 1) +
      this.getPlayerBetInStageNum(player, 2) +
      this.getPlayerBetInStageNum(player, 3) +
      this.getPlayerBetInStageNum(player, 4)
    );
  };

  this.calculateMoney = (winnerPot, players) => {
    let playerInvestments = [...players];
    while (playerInvestments.length > 1) {
      const sortedByInvested = playerInvestments.sort((a, b) =>
        a.invested < b.invested ? -1 : 1
      );
      const minStack = sortedByInvested[0].invested;
      winnerPot += minStack * playerInvestments.length;
      for (p of playerInvestments) {
        p.invested -= minStack;
      }
      const sortedByHandStrength = playerInvestments.sort((a, b) =>
        a.handStrength > b.handStrength ? -1 : 1
      );
      const maxHand = sortedByHandStrength[0].handStrength;
      const winners = playerInvestments.filter(
        (p) => p.handStrength === maxHand && p.live
      );
      for (p of winners) {
        p.result += winnerPot / winners.length;
      }
      playerInvestments = playerInvestments.filter((p) => p.invested > 0);
      winnerPot = 0;
    }

    if (playerInvestments.length === 1) {
      let p = playerInvestments[0];
      p.result += winnerPot + p.invested;
    }
  };

  this.distributeMoney = (result) => {
    let playerInvestments = this.players.map((p) => {
      const winData = result.winnerData.find((w) => w.player === p);
      const invested = this.getTotalInvested(p);
      return {
        player: p,
        invested: invested,
        originalInvested: invested,
        handStrength: winData ? winData.rank : -1,
        result: -invested,
        live: p.getStatus() !== 'Fold',
        winner: false,
        gain: 0,
      };
    });
    let pot = this.foldPot;
    this.calculateMoney(pot, playerInvestments);

    for (p of playerInvestments) {
      p.gain = p.originalInvested + p.result;
      p.player.money += p.gain;
      if (p.gain > 0) {
        p.winner = true;
      }
    }
    return playerInvestments;
  };

  this.evaluateWinners = () => {
    let handArray = [];
    let playerArray = [];
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].getStatus() != 'Fold') {
        let h = Hand.solve(
          this.convertCardsFormat(this.players[i].cards.concat(this.community))
        );
        handArray.push(h);
        playerArray.push({ player: this.players[i], hand: h });
      }
    }
    const winners = Hand.winners(handArray);

    let winnerData = [];
    if (Array.isArray(winners)) {
      for (playerHand of playerArray) {
        for (winner of winners) {
          let winnerArray = winner.toString().split(', ');
          if (
            this.arraysEqual(playerHand.hand.cards.sort(), winnerArray.sort())
          ) {
            winnerData.push({
              player: playerHand.player,
              rank: playerHand.hand.rank,
              handTitle: playerHand.hand.name,
            });
            break;
          }
        }
      }
    } else {
      this.log('fatal error: winner cannot be calculated');
    }
    const res = { winnerData: winnerData, playersData: playerArray };
    return res;
  };

  this.arraysEqual = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    for (let i = 0; i < a.length; ++i) {
      if (a[i] != b[i]) return false;
    }
    return true;
  };

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
  };

  this.endHandAllFold = (username) => {
    this.log('endhandallfold' + this.players);
    this.roundInProgress = false;
    let cardData = [];
    for (let i = 0; i < this.players.length; i++) {
      cardData.push({
        username: this.players[i].getUsername(),
        money: this.players[i].getMoney(),
        text: this.players[i].getStatus(),
      });
    }
    for (let pn = 0; pn < this.getNumPlayers(); pn++) {
      this.players[pn].emit('endHand', {
        winner: username,
        folded: this.players[pn].getUsername() != username ? 'Fold' : '',
        username: this.players[pn].getUsername(),
        pot: this.getCurrentPot(),
        money: this.players[pn].getMoney(),
        cards: cardData,
        bets: this.roundData.bets,
      });
    }
  };

  this.revealCards = (winners) => {
    this.log('revealllllll');
    this.roundInProgress = false;
    let cardData = [];
    for (let i = 0; i < this.players.length; i++) {
      const winData = winners.find((w) => w.player === this.players[i]);
      cardData.push({
        username: this.players[i].getUsername(),
        cards: this.players[i].cards,
        hand: this.players[i].getStatus(),
        folded: this.players[i].getStatus() == 'Fold',
        money: this.players[i].getMoney(),
        buyIns: this.players[i].buyIns,
        gain: winData ? winData.gain : null,
      });
    }
    const winnersUsernames = winners
      .map((a) => a.player.getUsername())
      .toString();
    for (let pn = 0; pn < this.getNumPlayers(); pn++) {
      this.players[pn].emit('reveal', {
        username: this.players[pn].getUsername(),
        money: this.players[pn].getMoney(),
        cards: cardData,
        bets: this.roundData.bets,
        winners: winnersUsernames,
        hand: this.players[pn].getStatus(),
      });
    }
  };

  this.allPlayersAllIn = () => {
    let participatingPlayers = 0;
    for (player of this.players) {
      if (!player.allIn && player.getStatus() != 'Fold') participatingPlayers++;
    }
    return participatingPlayers <= 1;
  };

  this.isStageComplete = () => {
    let allPlayersPresent = false;
    let numUnfolded = 0;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].status != 'Fold' && !this.players[i].allIn)
        numUnfolded++;
    }
    const currRound = this.getCurrentRoundBets();
    if (this.roundData.bets.length == 1) {
      allPlayersPresent =
        currRound.filter((a) => a.bet != 'Fold').length >= numUnfolded &&
        this.bigBlindWent;
    } else {
      allPlayersPresent =
        currRound.filter((a) => a.bet != 'Fold').length >= numUnfolded;
    }
    this.log('all players present ' + allPlayersPresent);
    let allPlayersCall = true;
    for (player of this.players) {
      if (
        player.getStatus() != 'Fold' &&
        this.getPlayerBetInStage(player) != this.getCurrentTopBet() &&
        !player.allIn
      ) {
        allPlayersCall = false;
        break;
      }
    }
    this.log('all players call ' + allPlayersCall);
    return allPlayersPresent && allPlayersCall;
  };

  this.setCardsPerPlayer = (numCards) => {
    this.cardsPerPlayer = numCards;
  };

  this.getHostName = () => {
    return this.host;
  };

  this.getPlayersArray = () => {
    return this.players.map((p) => {
      return p.getUsername();
    });
  };

  this.getCode = () => {
    return this.gameName;
  };

  this.addPlayer = (playerName, socket) => {
    const player = new Player(playerName, socket, this.debug);
    this.players.push(player);
    return player;
  };

  this.getNumPlayers = () => {
    return this.players.length;
  };

  this.startGame = () => {
    this.dealCards();
    this.emitPlayers('startGame', {
      players: this.players.map((p) => {
        return p.username;
      }),
    });
    this.startNewRound();
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

      this.players[pn].emit('dealt', {
        currBet: this.getCurrentTopBet(),
        username: this.players[pn].getUsername(),
        cards: this.players[pn].cards,
        players: this.players.map((p) => {
          return p.username;
        }),
      });
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

  this.disconnectPlayer = (player) => {
    this.disconnectedPlayers.push(player);
    if (player.getStatus() == 'Their Turn') {
      this.moveOntoNextPlayer();
    }
    this.players = this.players.filter((a) => a !== player);
    if (player.getUsername() == this.host) {
      if (this.players.length > 0) {
        this.host = this.players[0].getUsername();
      }
    }
    this.emitPlayers('playerDisconnected', { player: player.getUsername() });
    this.emitPlayers('joinRoomUpdate', {
      players: this.getPlayersArray(),
      code: this.getCode(),
    });
    this.emitPlayers('hostRoomUpdate', { players: this.getPlayersArray() });
    this.rerender();
  };

  this.checkBigBlindWent = (socket) => {
    if (
      this.findPlayer(socket.id).blindValue == 'Big Blind' &&
      this.roundData.bets.length == 1
    ) {
      this.bigBlindWent = true;
    }
  };

  this.getCurrentRoundBets = () => {
    return this.roundData.bets[this.roundData.bets.length - 1];
  };

  this.setCurrentRoundBets = (bets) => {
    return (this.roundData.bets[this.roundData.bets.length - 1] = bets);
  };

  this.fold = (socket) => {
    this.checkBigBlindWent(socket);
    const player = this.findPlayer(socket.id);
    let preFoldBetAmount = 0;

    let roundDataStage = this.getCurrentRoundBets().find(
      (a) => a.player == player.getUsername()
    );
    if (roundDataStage != undefined && roundDataStage.bet != 'Fold') {
      preFoldBetAmount += roundDataStage.bet;
    }
    player.setStatus('Fold');
    this.foldPot = this.foldPot + preFoldBetAmount;
    if (
      this.getCurrentRoundBets().some((a) => a.player == player.getUsername())
    ) {
      this.setCurrentRoundBets(
        this.getCurrentRoundBets().map((a) =>
          a.player == player.getUsername()
            ? { player: player.getUsername(), bet: 'Fold' }
            : a
        )
      );
    } else {
      this.getCurrentRoundBets().push({
        player: player.getUsername(),
        bet: 'Fold',
      });
    }
    this.lastMoveParsed = { move: 'Fold', player: player };
    this.moveOntoNextPlayer();
    return true;
  };

  this.call = (socket) => {
    this.checkBigBlindWent(socket);
    const player = this.findPlayer(socket.id);
    let currBet = this.getPlayerBetInStage(player);
    const topBet = this.getCurrentTopBet();
    if (currBet === 0) {
      if (
        this.getCurrentRoundBets().some((a) => a.player == player.getUsername())
      ) {
        if (player.getMoney() - topBet <= 0) {
          this.setCurrentRoundBets(
            this.getCurrentRoundBets().map((a) =>
              a.player == player.username
                ? { player: player.getUsername(), bet: player.getMoney() }
                : a
            )
          );
          player.money = 0;
          player.allIn = true;
        } else {
          this.setCurrentRoundBets(
            this.getCurrentRoundBets().map((a) =>
              a.player == player.username
                ? { player: player.getUsername(), bet: topBet }
                : a
            )
          );
          player.money = player.money - topBet;
        }
      } else {
        if (player.getMoney() - topBet <= 0) {
          this.getCurrentRoundBets().push({
            player: player.getUsername(),
            bet: player.getMoney(),
          });
          player.money = 0;
          player.allIn = true;
        } else {
          this.getCurrentRoundBets().push({
            player: player.getUsername(),
            bet: topBet,
          });
          player.money = player.money - topBet;
        }
      }
      this.moveOntoNextPlayer();
      return true;
    } else {
      if (
        this.getCurrentRoundBets().some((a) => a.player == player.getUsername())
      ) {
        if (player.getMoney() + currBet - topBet <= 0) {
          this.setCurrentRoundBets(
            this.getCurrentRoundBets().map((a) =>
              a.player == player.username
                ? {
                    player: player.getUsername(),
                    bet: player.getMoney() + currBet,
                  }
                : a
            )
          );
          player.money = 0;
          player.allIn = true;
          this.moveOntoNextPlayer();
        } else {
          this.setCurrentRoundBets(
            this.getCurrentRoundBets().map((a) =>
              a.player == player.username
                ? { player: player.getUsername(), bet: topBet }
                : a
            )
          );
          player.money = player.money - (topBet - currBet);
          this.moveOntoNextPlayer();
        }
        return true;
      } else {
        this.log('this should not happen');
      }
    }
  };

  this.bet = (socket, bet) => {
    this.checkBigBlindWent(socket);
    if (bet >= this.bigBlind) {
      const player = this.findPlayer(socket.id);
      if (player.getMoney() - bet >= 0) {
        this.setCurrentRoundBets(
          this.getCurrentRoundBets().filter(
            (a) => a.player != player.getUsername()
          )
        );
        this.getCurrentRoundBets().push({
          player: player.getUsername(),
          bet: bet,
        });
        player.money = player.money - bet;
        if (player.money == 0) player.allIn = true;
        this.moveOntoNextPlayer();
        return true;
      }
    }
  };

  this.check = (socket) => {
    this.checkBigBlindWent(socket);
    let currBet = 0;
    const player = this.findPlayer(socket.id);
    if (
      this.getCurrentRoundBets().find(
        (a) => a.player == player.getUsername()
      ) != undefined
    ) {
      currBet = this.getCurrentRoundBets().find(
        (a) => a.player == player.getUsername()
      ).bet;
      this.setCurrentRoundBets(
        this.getCurrentRoundBets().map((a) =>
          a.player == player.getUsername()
            ? { player: player.getUsername(), bet: currBet }
            : a
        )
      );
    } else {
      this.getCurrentRoundBets().push({
        player: player.getUsername(),
        bet: currBet,
      });
    }
    this.moveOntoNextPlayer();
    return true;
  };

  this.raise = (socket, bet) => {
    this.checkBigBlindWent(socket);
    const topBet = this.getCurrentTopBet();
    const player = this.findPlayer(socket.id);
    const currBet = this.getPlayerBetInStage(player);
    const moneyToRemove = bet - currBet;
    if (
      moneyToRemove > 0 &&
      bet >= topBet &&
      player.getMoney() - moneyToRemove >= 0
    ) {
      if (currBet === 0) {
        this.setCurrentRoundBets(
          this.getCurrentRoundBets().filter(
            (a) => a.player != player.getUsername()
          )
        );
        this.getCurrentRoundBets().push({
          player: player.getUsername(),
          bet: bet,
        });
      } else {
        this.setCurrentRoundBets(
          this.getCurrentRoundBets().map((a) =>
            a.player == player.getUsername()
              ? { player: player.getUsername(), bet: bet }
              : a
          )
        );
      }
      player.money -= moneyToRemove;
      if (player.money == 0) player.allIn = true;
      this.moveOntoNextPlayer();
      return true;
    }
  };

  this.getPossibleMoves = (socket) => {
    const player = this.findPlayer(socket.id);
    const playerBet = this.getPlayerBetInStage(player);
    const topBet = this.getCurrentTopBet();
    let possibleMoves = {
      fold: 'yes',
      check: 'yes',
      bet: 'yes',
      call: topBet,
      raise: 'yes',
    };
    if (player.getStatus() == 'Fold') {
      this.log('Error: Folded players should not be able to move.');
    }
    if (topBet != 0) {
      possibleMoves.bet = 'no';
      possibleMoves.check = 'no';
      if (
        player.blindValue == 'Big Blind' &&
        !this.bigBlindWent &&
        topBet == this.bigBlind
      )
        possibleMoves.check = 'yes';
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
    return possibleMoves;
  };
};

module.exports = Game;
