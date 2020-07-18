//representation of a card in a standard 52 deck
const Card = function (value, suit) {
  this.value = value;
  this.suit = suit;

  const constructor = (function () {})(this);

  this.compare = (card) => {
    if (this.value < card.getValue()) return -1;
    if (this.value == card.getValue()) return 0;
    return 1;
  };

  this.isGreater = (card) => {
    return this.value > card.getValue() ? true : false;
  };

  this.getValue = () => {
    return this.value;
  };

  this.getSuit = () => {
    return this.suit;
  };

  this.print = () => console.log(this.getValue() + ' of ' + this.getSuit());
};

module.exports = Card;
