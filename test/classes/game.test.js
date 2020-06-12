const Game = require('../../src/classes/game.js');
const events = require('events');

test('Test call until fold then check', () => {
  const game = new Game('best-game', '1');

  // Mock socket
  const sock1 = new events.EventEmitter();
  sock1.id = 1;
  const sock2 = new events.EventEmitter();
  sock2.id = 2;

  const p1 = game.addPlayer("1", sock1);
  const p2 = game.addPlayer("2", sock2);
  expect(game.players.length).toBe(2);

  expect(game.findPlayer(1)).toBe(p1);
  expect(game.findPlayer(2)).toBe(p2);

  game.startGame();
});