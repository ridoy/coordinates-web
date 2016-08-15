/*
 * Coordinates Multiplayer
 * Author: Ridoy Majumdar (ridoymajumdar@gatech.edu)
 * Version: 0.0.1
 */

$('#viewport, #leave-button, #reset-button').hide()
$('#name-field, #join-button').show()
$('.status').text('');
$('.player-names').text('')

// Kick off game loop when user decides to join
$('#join-button').click(function() {
  // ... but exit if they haven't provided a name
  if ($('#name-field').val() === '') {
    $('.status').text('Enter a name to start playing.');
    return;
  }

  var socket       = io(),
      name         = $('#name-field').val(),
      winner,
      playerNum,
      opponentNum,
      gameId;

  $('#name-field, #join-button').hide()
  $('#leave-button').show()
  $('#name-field').val('');

  $('.status').text('Finding another player...');
  $('.player-names').text('')

  socket.emit('requestToJoinGame', {
    name: name
  });

  socket.on('joinedGame', function(msg) {
    // 1 is blue, 2 is red
    playerNum = msg.playerNum;
    opponentNum = (playerNum === 1) ? 2 : 1;
    gameId = msg.gameId
  });

  socket.on('gameReady', function(msg) {
    $('.player-names').text(name + ' (You) vs. ' + msg.opponentName)
    $('.status').text('');
    $('#viewport').show()
    initGame();
  });

  $('#leave-button').on('click', function() {
    socket.emit('cancelGame');
  });


  function initGame() {
    this.canvas        = document.getElementById('viewport');
    this.ctx           = this.canvas.getContext('2d');
    this.canvas.width  = 500;
    this.canvas.height = 500;
    this.boardRadius   = 250;
    this.grid          = {};
    this.currIndex     = { r: 0, c: 0 }
    this.numRows       = 4;
    this.numCols       = 8;
    this.winLength     = 4;
    this.turn          = 1;

    /*
     * Event listeners
     */

    // Handle mapping of mouse position to cursor piece
    $('#viewport').on('mousemove', function(event) {
      updateBoard();

      // Which position on the board is closest to the mouse's position?
      var minDist = canvas.width;
      for (var r = 0; r < numRows; r++) {
        for (var c = 0; c < numCols; c++) {
          var dist = Math.sqrt(Math.pow(event.offsetX - grid[r][c].x, 2) + Math.pow(event.offsetY - grid[r][c].y, 2));
          if (dist < minDist) {
            minDist = dist;
            currIndex = {
              r: r,
              c: c
            };
          }
        }
      }

      var position = grid[currIndex.r][currIndex.c];
      drawCursor(position.x, position.y);
    });

    // Handle setting a piece on the board
    $('#viewport').on('click', function() {
      if (!grid[currIndex.r][currIndex.c].owner && turn === playerNum) {
        grid[currIndex.r][currIndex.c].owner = playerNum;
        winner = (checkWin(1)) ? 1 : (checkWin(2)) ? 2 : null
        if (winner) {
          ctx.clearRect(0,0,canvas.width, canvas.height)
          endGame();
        } else {
          socket.emit('moveMade', {
            r: currIndex.r,
            c: currIndex.c
          });
          updateBoard();
          alternateTurn();
        }
      }
    });


    /*
     * Gameplay Functions
     */

    function alternateTurn() {
      turn = (turn === 1) ? 2 : 1;
      if (turn !== playerNum){
        $('.status').text('Waiting for opponent to make a move...')
      } else {
        $('.status').text('')
      }
    }

    $('#reset-button').one('click', function() {
      returnToMenu();
    });

    socket.on('gameCanceled', function(msg) {
      $('.player-names').text('')
      $('#viewport').off('mousemove, click');
      console.log(winner, playerNum);
      var text = (winner === playerNum) ? 'You won!' : 'Your opponent won :(';
      $('.status').text(text);
      $('#leave-button').hide();
      $('#reset-button').show();
    });

    function returnToMenu() {
      resetGrid();
      $('.player-names').text('')
      $('.status').text('')
      // Show beginning dialog
      $('#viewport, #leave-button, #reset-button').hide()
      $('#name-field, #join-button').show()
    }

    function endGame() {
      socket.emit('gameOver');
    }

    if (turn !== playerNum) {
      $('.status').text('Waiting for opponent to make a move...')
    }

    socket.on('opponentMoveMade', function(msg) {
      grid[msg.r][msg.c].owner = opponentNum;
      drawPiece(msg.r, msg.c);

      // Check if opposing move was a winning one
      winner = (checkWin(1)) ? 1 : (checkWin(2)) ? 2 : null
      if (winner) {
        endGame();
      } else {
        alternateTurn();
      }
    });

    function checkWin(player) {
      // Circular win check
      for (var r = 0; r < numRows; r++) {
        var stack = [];
        for (var c = 0; c < numCols + winLength; c++) {
          if (grid[r][c % numCols].owner === player) {
            stack.push({r: r, c: c});
          } else {
            stack = [];
          }
          if (stack.length === winLength) return true;
        }
      }
      // Outward win check
      for (var c = 0; c < numCols; c++) {
        var stack = [];
        for (var r = 0; r < numRows; r++) {
          if (grid[r][c].owner === player) {
            stack.push({r: r, c: c});
          } else {
            stack = [];
          }
          if (stack.length === winLength) return true; 
        }
      }
      // Clockwise spiral win check
      for (var c = 0; c < numCols; c++) {
        var stack = [];
        var pivot = c;
        var r = 0;
        done = false
        while (!done) {
          adjustedPivot = ((pivot % numCols) + numCols) % numCols
          if (grid[r][adjustedPivot].owner === player) {
            stack.push({r: r, c: adjustedPivot});
            pivot++;
            r++;
          } else {
            done = true;
          }
          if (stack.length === winLength) return true;
        }
      }
      // Counterclockwise spiral win check
      for (var c = numCols; c >= 0; c--) {
        var stack = [];
        var pivot = c;
        var r = 0;
        done = false
        while (!done) {
          adjustedPivot = ((pivot % numCols) + numCols) % numCols
          if (grid[r][adjustedPivot].owner === player) {
            stack.push({r: r, c: adjustedPivot});
            pivot--;
            r++;
          } else {
            done = true;
          }
          if (stack.length === winLength) return true;
        }
      }

      return false; // If no winning conditions are met
    }

    /*
     * Board Drawing
     */

    (function initBoard() {
      resetGrid();
      drawBoard();
    })();

    function drawBoard() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'black';
      ctx.beginPath();
      for (var r = 0; r < numRows + 1; r++) {
        ctx.arc(250, 250, (r / 4) * 250, 0, 2*Math.PI);
      }
      var x = 250;
      var y = 0;
      for (var c = 0; c < numCols; c++) {
        ctx.moveTo(x + 250, y + 250);
        var temp = x;
        x = (x * Math.cos(Math.PI / 4)) - (y * Math.sin(Math.PI / 4));
        y = (temp * Math.sin(Math.PI / 4)) + (y * Math.cos(Math.PI / 4));
        ctx.lineTo(250, 250);
      }
      ctx.stroke();
    }

    function drawCursor(x, y) {
      ctx.strokeStyle = (playerNum === 1) ? 'blue' : 'red';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawPiece(r, c) {
      x = grid[r][c].x
      y = grid[r][c].y
      player = grid[r][c].owner
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'black';
      ctx.fillStyle = (player === 1) ? 'blue' : 'red';

      ctx.fill();
      ctx.stroke();
    }

    function updateBoard() {
      // Clear everything...
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // ... and then redraw everything
      drawBoard();
      for (var r = 0; r < numRows; r++) {
        for (var c = 0; c < numCols; c++) {
          if (grid[r][c].owner) {
            drawPiece(r, c)
          }
        }
      }
    }

    function resetGrid() {
      for (var r = 0; r < numRows; r++) {
        x = ((r * boardRadius / numRows) + (boardRadius / (numRows * 2))) * Math.cos(Math.PI / (numRows * 2))
        y = ((r * boardRadius / numRows) + (boardRadius / (numRows * 2))) * Math.sin(Math.PI / (numRows * 2))
        grid[r] = {}
        for (var c = 0; c < numCols; c++) {
          grid[r][c] = {
            x: x + boardRadius,
            y: y + boardRadius,
            owner: null
          }
          oldX = x
          x = (x * Math.cos(Math.PI / 4)) - (y * Math.sin(Math.PI / 4))
          y = (oldX * Math.sin(Math.PI / 4)) + (y * Math.cos(Math.PI / 4))
        }
      }
    }
  }
});
