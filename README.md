# Multiplayer Texas Hold 'Em
[![GitHub license](https://img.shields.io/github/license/Naereen/StrapDown.js.svg)](https://github.com/ptwu/distributed-texasholdem/blob/master/LICENSE)
![1.0.0](https://img.shields.io/badge/version-1.0.0-blue.svg)
![CI](https://github.com/ptwu/distributed-texasholdem/workflows/CI/badge.svg)

Play at https://distributed-texasholdem.onrender.com. Note that the site has to cold start because I'm a 
college student who doesn't want to pay for anything beyond the free plan.

Using `socket.io`, `Node.js`, and `express` to make a distributed poker game. Allows for multiple
gameplay rooms simultaneously across different devices.

![Image of Distributed Texas Hold Em Gameplay](https://i.imgur.com/eGj6iHU.png)
![Image of Distributed Texas Hold Em Lobby](https://i.imgur.com/TCusHG0.png)

## Commands
`yarn install` installs all the dependencies required to run the webapp.

`yarn dev` starts the game with hot reloading provided by `nodemon`.
  - The game will be viewable by navigating to `localhost:3000`.

`yarn start` runs the Node server without hot reloading. Intended for deployment use.

`yarn test` evaluates the unit tests located in test/classes/.
