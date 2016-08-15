/*
 * Coordinates Multiplayer
 * Author: Ridoy Majumdar (ridoymajumdar@gatech.edu)
 * Version: 0.0.1
 */


/*
 * Setup: imports, starting server
 */

var express = require('express'),
    app     = express(),
    http    = require('http').Server(app),
    io      = require('socket.io')(http),
    uuid    = require('node-uuid'),
    port    = process.env.PORT || 4000;

app.use(express.static('public'));

http.listen(port, function() {
  console.log('Listening on port ' + port);
});

/*
 * Game logic
 */

var games = [];

function getFirstAvailableGame() {
  for (var game of games) {
    if (game.players.length === 1) return game;
  }
  return false;
}

function getOpponent(gameId, playerNum) {
  for (var game of games) {
    if (game.id === gameId) {
      for (var player of game.players) {
        if (player.playerNum !== playerNum) return player;
      }
    }
  }
  return false;
}

function endGame(gameId) {
  for (var i = 0; i < games.length; i++) {
    if (games[i].id === gameId) {
      for (var player of games[i].players) {
        player.emit('gameCanceled');
      }
      return games.splice(i, 1);
    }
  }
}

function printGames() {
  console.log('Currently active games:');
  for (var game of games) {
    var playerNames = '';
    for (var player of game.players) {
      playerNames += player.name + ' & ';
    }
    playerNames = playerNames.slice(0, -3);
    console.log('- Game ' + game.id + ' with players ' + playerNames)
  }
}

/*
 * Networking logic
 */

io.on('connection', function(client) {
  console.log('New friend connected!');

  client.on('requestToJoinGame', function(msg) {
    client.name = msg.name;

    // Attempt to join available game, or create a new one
    var availableGame = getFirstAvailableGame();
    if (availableGame) {
      client.gameId = availableGame.id;
      client.playerNum = 2;
      availableGame.players.push(client);
      for (var player of availableGame.players) {
        var opponent = getOpponent(availableGame.id, player.playerNum)
        if (opponent) {
          var opponentName = opponent.name;
        }
        player.emit('gameReady', {
          opponentName: opponentName
        });
      }
    } else {
      client.gameId = uuid.v1();
      client.playerNum = 1;
      games.push({
        players: [client],
        id: client.gameId
      });
    }

    printGames();

    // Send back game info to player
    client.emit('joinedGame', {
      playerNum: client.playerNum,
      gameId: client.gameId
    });
  });

  // When this player makes a move, send that move to their opponent
  client.on('moveMade', function(msg) {
    var opponent = getOpponent(client.gameId, client.playerNum);
    opponent.emit('opponentMoveMade', {
      r: msg.r,
      c: msg.c
    });
  });

  // End game if a player won,
  client.on('gameOver', function() {
    endGame(client.gameId);
  });
  // if a player left the game,
  client.on('cancelGame', function() {
    endGame(client.gameId);
  });
  // or if a player left the window.
  client.on('disconnect', function() {
    endGame(client.gameId);
  });

});
