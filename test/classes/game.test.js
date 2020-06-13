const Game = require('../../src/classes/game.js');
const events = require('events');

test('Test call until fold then check', () => {
  const game = new Game('best-game', '1');
  game.smallBlind = 5;
  game.bigBlind = 10;

  // Mock socket
  const sock1 = new events.EventEmitter();
  sock1.id = 1;
  const sock2 = new events.EventEmitter();
  sock2.id = 2;

  const p1 = game.addPlayer("1", sock1);
  expect(p1.money).toBe(100);
  const p2 = game.addPlayer("2", sock2);
  expect(p2.money).toBe(100);

  expect(game.findPlayer(1)).toBe(p1);
  expect(game.findPlayer(2)).toBe(p2);

  expect(game.players.length).toBe(2);
  
  expect(game.roundNum).toBe(0);
  expect(game.roundData.bets.length).toBe(0);
  game.startGame();
  expect(game.roundNum).toBe(1);
  expect(game.roundData.bets.length).toBeGreaterThan(0);

  const smallPlayer = game.players[game.roundData.smallBlind];
  const bigPlayer = game.players[game.roundData.bigBlind];

  // Test parametable small/big blind
  expect(smallPlayer.money).toBe(95);
  expect(bigPlayer.money).toBe(90);

  expect(smallPlayer.status).toBe('Their Turn');

  // Pre-Flop
  game.call(smallPlayer.socket);
  expect(game.roundNum).toBe(1);
  expect(game.roundData.bets.length).toBe(1);

  // Flop
  game.check(bigPlayer.socket);
  game.check(smallPlayer.socket);
  expect(game.roundNum).toBe(1);
  expect(game.roundData.bets.length).toBe(2);

  // Turn
  game.check(bigPlayer.socket);
  game.check(smallPlayer.socket);
  expect(game.roundNum).toBe(1);
  expect(game.roundData.bets.length).toBe(3);

  // River
  game.check(bigPlayer.socket);
  game.check(smallPlayer.socket);
  expect(game.roundNum).toBe(1);
  expect(game.roundData.bets.length).toBe(4);

  // End of game
  game.check(bigPlayer.socket);
  game.check(smallPlayer.socket);
  expect(game.roundNum).toBe(1);
});

test('Test raise more than possessed', () => {
  const game = new Game('best-game', '1');
  game.smallBlind = 5;
  game.bigBlind = 10;

  // Mock socket
  const sock1 = new events.EventEmitter();
  sock1.id = 1;
  const sock2 = new events.EventEmitter();
  sock2.id = 2;

  const p1 = game.addPlayer("1", sock1);
  expect(p1.money).toBe(100);
  const p2 = game.addPlayer("2", sock2);
  expect(p2.money).toBe(100);

  expect(game.findPlayer(1)).toBe(p1);
  expect(game.findPlayer(2)).toBe(p2);

  expect(game.players.length).toBe(2);
  
  expect(game.roundNum).toBe(0);
  expect(game.roundData.bets.length).toBe(0);
  game.startGame();
  expect(game.roundNum).toBe(1);
  expect(game.roundData.bets.length).toBeGreaterThan(0);

  const smallPlayer = game.players[game.roundData.smallBlind];
  const bigPlayer = game.players[game.roundData.bigBlind];

  // Test parametable small/big blind
  expect(smallPlayer.money).toBe(95);
  expect(bigPlayer.money).toBe(90);

  expect(smallPlayer.status).toBe('Their Turn');

  // Pre-Flop
  expect(game.call(smallPlayer.socket)).toBe(true);
  expect(game.roundNum).toBe(1);
  expect(game.roundData.bets.length).toBe(1);

  // Flop
  expect(game.raise(bigPlayer.socket, 1000)).not.toBe(true);
});

test('Test bet more than possessed', () => {
  const game = new Game('best-game', '1');
  game.smallBlind = 5;
  game.bigBlind = 10;

  // Mock socket
  const sock1 = new events.EventEmitter();
  sock1.id = 1;
  const sock2 = new events.EventEmitter();
  sock2.id = 2;

  const p1 = game.addPlayer("1", sock1);
  expect(p1.money).toBe(100);
  const p2 = game.addPlayer("2", sock2);
  expect(p2.money).toBe(100);

  expect(game.findPlayer(1)).toBe(p1);
  expect(game.findPlayer(2)).toBe(p2);

  expect(game.players.length).toBe(2);
  
  expect(game.roundNum).toBe(0);
  expect(game.roundData.bets.length).toBe(0);
  game.startGame();
  expect(game.roundNum).toBe(1);
  expect(game.roundData.bets.length).toBeGreaterThan(0);

  const smallPlayer = game.players[game.roundData.smallBlind];
  const bigPlayer = game.players[game.roundData.bigBlind];

  // Test parametable small/big blind
  expect(smallPlayer.money).toBe(95);
  expect(bigPlayer.money).toBe(90);

  expect(smallPlayer.status).toBe('Their Turn');

  // Pre-Flop
  expect(game.call(smallPlayer.socket)).toBe(true);
  expect(game.roundNum).toBe(1);
  expect(game.roundData.bets.length).toBe(1);

  // Flop
  game.check(bigPlayer.socket);
  game.check(smallPlayer.socket);
  expect(game.roundNum).toBe(1);
  expect(game.roundData.bets.length).toBe(2);

  // Turn
  expect(game.bet(bigPlayer.socket, 1000)).not.toBe(true);
});