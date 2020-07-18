const Card = require('./card');

// representation of a deck of standard (52) playing cards
const Deck = function () {
  this.cards = [];

  const constructor = (function (deck) {
    const suits = ['♠', '♥', '♦', '♣'];
    for (let i = 0; i < suits.length; i++) {
      for (let j = 1; j <= 13; j++) {
        if (j === 1) {
          deck.cards.push(new Card('A', suits[i]));
        } else if (j === 11) {
          deck.cards.push(new Card('J', suits[i]));
        } else if (j === 12) {
          deck.cards.push(new Card('Q', suits[i]));
        } else if (j === 13) {
          deck.cards.push(new Card('K', suits[i]));
        } else {
          deck.cards.push(new Card(j, suits[i]));
        }
      }
    }
  })(this);

  this.shuffle = () => {
    this.cards = [];
    const suits = ['♠', '♥', '♦', '♣'];
    for (let i = 0; i < suits.length; i++) {
      for (let j = 1; j <= 13; j++) {
        if (j === 1) {
          this.cards.push(new Card('A', suits[i]));
        } else if (j === 11) {
          this.cards.push(new Card('J', suits[i]));
        } else if (j === 12) {
          this.cards.push(new Card('Q', suits[i]));
        } else if (j === 13) {
          this.cards.push(new Card('K', suits[i]));
        } else {
          this.cards.push(new Card(j, suits[i]));
        }
      }
    }
  };

  this.dealRandomCard = () => {
    const index = Math.floor(Math.random() * this.cards.length);
    value = this.cards[index];
    this.cards.splice(index, 1);
    return value;
  };
};

module.exports = Deck;
