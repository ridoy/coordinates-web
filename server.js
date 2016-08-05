/*
 * Coordinates Multiplayer
 * Author: Ridoy Majumdar (ridoymajumdar@gatech.edu)
 * Version: 0.0.1
 */

var express = require('express'),
    app     = express(),
    http    = require('http').Server(app),
    io      = require('socket.io')(http),
    uuid    = require('node-uuid'),
    port    = process.env.PORT || 4000;

app.use(express.static('public'));

var games = [];

function getAvailableGame() {
  for (let game of games) {
    if (game.players.length === 1) return game;
  }
  return false;
}

function getOpponent(gameId, playerNum) {
  for (let game of games) {
    if (game.id === gameId) {
      for (let player of game.players) {
        if (player.playerNum !== playerNum) return player;
      }
    }
  }
  return false;
}

io.on('connection', (client) => {
  console.log('New friend connected!');

  var availableGame = getAvailableGame();
  if (availableGame) {
    // Join first available game
    client.gameId = availableGame.id
    client.playerNum = 2;
    availableGame.players.push(client);
    for (let player of availableGame.players) {
      player.emit('gameReady');
    }
  } else {
    // Create new game
    client.gameId = uuid.v1();
    client.playerNum = 1;
    games.push({
      players: [client],
      id: client.gameId
    });
  }
  console.log(games);

  client.emit('joinedGame', {
    playerNum: client.playerNum,
    gameId: client.gameId
  });

  client.on('disconnect', function() {
    console.log('Player' + client.id + ' disconnected');
    if (client.gameId) {
      for (var i = 0; i < games.length; i++) {
        for (let player of games[i].players) {
          player.emit('gameCanceled');
        }
        games.splice(i, 1);
      }
    }
  });

  client.on('moveMade', function(msg) {
    var opponent = getOpponent(client.gameId, client.playerNum);
    opponent.emit('opponentMoveMade', {
      r: msg.r,
      c: msg.c
    });
  });

  client.on('gameOver', function(msg) {
    var opponent = getOpponent(client.gameId, client.playerNum);
    opponent.emit('gameIsOver', {
      winner: client.playerNum
    })
  });
});

http.listen(port, () => {
  console.log('Listening on port ' + port);
});
