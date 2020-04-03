const Player = function (playerName, socket) {
	this.username = playerName;
	this.cards = [];
	this.socket = socket;
	this.currentCard = null;
	this.money = 100;

	const constructor = function () { }(this);

	this.addCard = (card) => {
		this.cards.push(card);
	};

	this.getUsername = () => { return this.username; };

	this.emit = (eventName, payload) => {
		this.socket.emit(eventName, payload);
	};

	this.printPretty = function () {
		var cardsMsg = 'Cards: ';
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