const Player = function (playerName, socket) {
	this.username = playerName;
	this.cards = [];
	this.socket = socket;
	this.currentCard = null;
	this.money = 100;
	this.buyIns = 0;
	this.status = 'none';
	this.blindValue = 'none';
	this.allInAmt = 0;

	const constructor = function () { }(this);

	this.addCard = (card) => {
		this.cards.push(card);
	};

	this.setStatus = (data) => this.status = data;
	this.setBlind = (data) => this.blindValue = data;
	this.getUsername = () => { return this.username; };
	this.getBuyIns = () => { return this.buyIns; };
	this.getMoney = () => { return this.money; };
	this.getStatus = () => { return this.status; };
	this.getBlindValue = () => { return this.blindValue; };

	this.emit = (eventName, payload) => {
		this.socket.emit(eventName, payload);
	};

	this.printPretty = () => {
		let cardsMsg = 'Cards: ';
		for (i = 0; i < this.cards.length; i++) {
			cardsMsg += this.cards[i].getValue() + " " + this.cards[i].getSuit() + ', ';
		}

		console.log('----------------- PLAYER');
		console.log('Username:', this.username);
		console.log(cardsMsg);
		console.log('SocketID: ', this.socket.id);
		console.log('----------------- PLAYER');
	};

};

module.exports = Player;