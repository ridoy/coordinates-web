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
  for (var i = 0; i < games.length; i++) {
    if (games[i].players.length === 1) return games[i];
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
    for (var i = 0; i < availableGame.players.length; i++) {
      availableGame.players[i].emit('gameReady');
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

  client.emit('joinedGame', {
    playerNum: client.playerNum,
    gameId: client.gameId
  });

  client.on('disconnect', function() {
    console.log('Player' + client.id + ' disconnected');
    if (client.gameId) {
      for (var i = 0; i < games.length; i++) {
        for (var j = 0; j < games[i].players.length; j++) {
          games[i].players[j].emit('gameCanceled');
        }
        games.splice(i, 1);
      }
    }
  });

  client.on('moveMade', function(msg) {

  });
});

http.listen(port, () => {
  console.log('Listening on port ' + port);
});
