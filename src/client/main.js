$(document).ready(function () {
  $('#gameDiv').hide();
  $('.modal-trigger').leanModal();
  $('.tooltipped').tooltip({ delay: 50 });
});

var socket = io();
var gameInfo = null;

socket.on('playerDisconnected', function (data) {
  Materialize.toast(data.player + ' disconnected.', 4000);
});

socket.on('hostRoom', function (data) {
  if (data != undefined) {
    if (data.players.length >= 11) {
      $('#hostModalContent').html(
        '<h5>Code:</h5><code>' +
          data.code +
          '</code><br /><h5>Warning: you have too many players in your room. Max is 11.</h5><h5>Players Currently in My Room</h5>'
      );
      $('#playersNames').html(
        data.players.map(function (p) {
          return '<span>' + p + '</span><br />';
        })
      );
    } else if (data.players.length > 1) {
      $('#hostModalContent').html(
        '<h5>Code:</h5><code>' +
          data.code +
          '</code><br /><h5>Players Currently in My Room</h5>'
      );
      $('#playersNames').html(
        data.players.map(function (p) {
          return '<span>' + p + '</span><br />';
        })
      );
      $('#startGameArea').html(
        '<br /><button onclick=startGame(' +
          data.code +
          ') type="submit" class= "waves-effect waves-light green darken-3 white-text btn-flat">Start Game</button >'
      );
    } else {
      $('#hostModalContent').html(
        '<h5>Code:</h5><code>' +
          data.code +
          '</code><br /><h5>Players Currently in My Room</h5>'
      );
      $('#playersNames').html(
        data.players.map(function (p) {
          return '<span>' + p + '</span><br />';
        })
      );
    }
  } else {
    Materialize.toast(
      'Enter a valid name! (max length of name is 12 characters)',
      4000
    );
    $('#joinButton').removeClass('disabled');
  }
});

socket.on('hostRoomUpdate', function (data) {
  $('#playersNames').html(
    data.players.map(function (p) {
      return '<span>' + p + '</span><br />';
    })
  );
  if (data.players.length == 1) {
    $('#startGameArea').empty();
  }
});

socket.on('joinRoomUpdate', function (data) {
  $('#startGameAreaDisconnectSituation').html(
    '<br /><button onclick=startGame(' +
      data.code +
      ') type="submit" class= "waves-effect waves-light green darken-3 white-text btn-flat">Start Game</button >'
  );
  $('#joinModalContent').html(
    '<h5>' +
      data.host +
      "'s room</h5><hr /><h5>Players Currently in Room</h5><p>You are now a host of this game.</p>"
  );

  $('#playersNamesJoined').html(
    data.players.map(function (p) {
      return '<span>' + p + '</span><br />';
    })
  );
});

socket.on('joinRoom', function (data) {
  if (data == undefined) {
    $('#joinModal').closeModal();
    Materialize.toast(
      "Enter a valid name/code! (max length of name is 12 characters & cannot be the same as someone else's)",
      4000
    );
    $('#hostButton').removeClass('disabled');
  } else {
    $('#joinModalContent').html(
      '<h5>' +
        data.host +
        "'s room</h5><hr /><h5>Players Currently in Room</h5><p>Please wait until your host starts the game. Leaving the page, refreshing, or going back will disconnect you from the game. </p>"
    );
    $('#playersNamesJoined').html(
      data.players.map(function (p) {
        return '<span>' + p + '</span><br />';
      })
    );
  }
});

socket.on('dealt', function (data) {
  $('#mycards').html(
    data.cards.map(function (c) {
      return renderCard(c);
    })
  );
  $('#usernamesCards').text(data.username + ' - My Cards');
  $('#mainContent').remove();
});

socket.on('rerender', function (data) {
  if (data.myBet == 0) {
    $('#usernamesCards').text(data.username + ' - My Cards');
  } else {
    $('#usernamesCards').text(data.username + ' - My Bet: $' + data.myBet);
  }
  if (data.community != undefined)
    $('#communityCards').html(
      data.community.map(function (c) {
        return renderCard(c);
      })
    );
  else $('#communityCards').html('<p></p>');
  if (data.currBet == undefined) data.currBet = 0;
  $('#table-title').text(
    'Game ' +
      data.round +
      '    |    ' +
      data.stage +
      '    |    Current Top Bet: $' +
      data.topBet +
      '    |    Pot: $' +
      data.pot
  );
  $('#opponentCards').html(
    data.players.map(function (p) {
      return renderOpponent(p.username, {
        text: p.status,
        money: p.money,
        blind: p.blind,
        bets: data.bets,
        buyIns: p.buyIns,
        isChecked: p.isChecked,
      });
    })
  );
  renderSelf({
    money: data.myMoney,
    text: data.myStatus,
    blind: data.myBlind,
    bets: data.bets,
    buyIns: data.buyIns,
  });
  if (!data.roundInProgress) {
    $('#usernameFold').hide();
    $('#usernameCheck').hide();
    $('#usernameBet').hide();
    $('#usernameCall').hide();
    $('#usernameRaise').hide();
  }
});

socket.on('gameBegin', function (data) {
  $('#navbar-ptwu').hide();
  $('#joinModal').closeModal();
  $('#hostModal').closeModal();
  if (data == undefined) {
    alert('Error - invalid game.');
  } else {
    $('#gameDiv').show();
  }
});

function playNext() {
  socket.emit('startNextRound', {});
}

socket.on('reveal', function (data) {
  $('#usernameFold').hide();
  $('#usernameCheck').hide();
  $('#usernameBet').hide();
  $('#usernameCall').hide();
  $('#usernameRaise').hide();

  for (var i = 0; i < data.winners.length; i++) {
    if (data.winners[i] == data.username) {
      Materialize.toast('You won the hand!', 4000);
      break;
    }
  }
  $('#table-title').text('Hand Winner(s): ' + data.winners);
  $('#playNext').html(
    '<button onClick=playNext() id="playNextButton" class="btn white black-text menuButtons">Start Next Game</button>'
  );
  $('#blindStatus').text(data.hand);
  $('#usernamesMoney').text('$' + data.money);
  $('#opponentCards').html(
    data.cards.map(function (p) {
      return renderOpponentCards(p.username, {
        cards: p.cards,
        folded: p.folded,
        money: p.money,
        endHand: p.hand,
        buyIns: p.buyIns,
      });
    })
  );
});

socket.on('endHand', function (data) {
  $('#usernameFold').hide();
  $('#usernameCheck').hide();
  $('#usernameBet').hide();
  $('#usernameCall').hide();
  $('#usernameRaise').hide();
  $('#table-title').text(data.winner + ' takes the pot of $' + data.pot);
  $('#playNext').html(
    '<button onClick=playNext() id="playNextButton" class="btn white black-text menuButtons">Start Next Game</button>'
  );
  $('#blindStatus').text('');
  if (data.folded == 'Fold') {
    $('#status').text('You Folded');
    $('#playerInformationCard').removeClass('theirTurn');
    $('#playerInformationCard').removeClass('green');
    $('#playerInformationCard').addClass('grey');
    $('#usernameFold').hide();
    $('#usernameCheck').hide();
    $('#usernameBet').hide();
    $('#usernameCall').hide();
    $('#usernameRaise').hide();
  }
  $('#usernamesMoney').text('$' + data.money);
  $('#opponentCards').html(
    data.cards.map(function (p) {
      return renderOpponent(p.username, {
        text: p.text,
        money: p.money,
        blind: '',
        bets: data.bets,
      });
    })
  );
});

var beginHost = function () {
  if ($('#hostName-field').val() == '') {
    $('.toast').hide();
    $('#hostModal').closeModal();
    Materialize.toast(
      'Enter a valid name! (max length of name is 12 characters)',
      4000
    );
    $('#joinButton').removeClass('disabled');
  } else {
    socket.emit('host', { username: $('#hostName-field').val() });
    $('#joinButton').addClass('disabled');
    $('#joinButton').off('click');
  }
};

var joinRoom = function () {
  // yes, i know this is client-side.
  if (
    $('#joinName-field').val() == '' ||
    $('#code-field').val() == '' ||
    $('#joinName-field').val().length > 12
  ) {
    $('.toast').hide();
    Materialize.toast(
      'Enter a valid name/code! (max length of name is 12 characters.)',
      4000
    );
    $('#joinModal').closeModal();
    $('#hostButton').removeClass('disabled');
    $('#hostButton').on('click');
  } else {
    socket.emit('join', {
      code: $('#code-field').val(),
      username: $('#joinName-field').val(),
    });
    $('#hostButton').addClass('disabled');
    $('#hostButton').off('click');
  }
};

var startGame = function (gameCode) {
  socket.emit('startGame', { code: gameCode });
};

var fold = function () {
  socket.emit('moveMade', { move: 'fold', bet: 'Fold' });
};

var bet = function () {
  if (parseInt($('#betRangeSlider').val()) == 0) {
    Materialize.toast('You must bet more than $0! Try again.', 4000);
  } else if (parseInt($('#betRangeSlider').val()) < 2) {
    Materialize.toast('The minimum bet is $2.', 4000);
  } else {
    socket.emit('moveMade', {
      move: 'bet',
      bet: parseInt($('#betRangeSlider').val()),
    });
  }
};

function call() {
  socket.emit('moveMade', { move: 'call', bet: 'Call' });
}

var check = function () {
  socket.emit('moveMade', { move: 'check', bet: 'Check' });
};

var raise = function () {
  if (
    parseInt($('#raiseRangeSlider').val()) == $('#raiseRangeSlider').prop('min')
  ) {
    Materialize.toast(
      'You must raise higher than the current top bet! Try again.',
      4000
    );
  } else {
    socket.emit('moveMade', {
      move: 'raise',
      bet: parseInt($('#raiseRangeSlider').val()),
    });
  }
};

function renderCard(card) {
  if (card.suit == '♠' || card.suit == '♣')
    return (
      '<div class="playingCard_black" id="card"' +
      card.value +
      card.suit +
      '" data-value="' +
      card.value +
      ' ' +
      card.suit +
      '">' +
      card.value +
      ' ' +
      card.suit +
      '</div>'
    );
  else
    return (
      '<div class="playingCard_red" id="card"' +
      card.value +
      card.suit +
      '" data-value="' +
      card.value +
      ' ' +
      card.suit +
      '">' +
      card.value +
      ' ' +
      card.suit +
      '</div>'
    );
}

function renderOpponent(name, data) {
  var bet = 0;
  if (data.bets != undefined) {
    var arr = data.bets[data.bets.length - 1];
    for (var pn = 0; pn < arr.length; pn++) {
      if (arr[pn].player == name) bet = arr[pn].bet;
    }
  }
  var buyInsText =
    data.buyIns > 0 ? (data.buyIns > 1 ? 'buy-ins' : 'buy-in') : '';
  if (data.buyIns > 0) {
    if (data.text == 'Fold') {
      return (
        '<div class="col s12 m2 opponentCard"><div class="card grey"><div class="card-content white-text"><span class="card-title">' +
        name +
        ' (Fold)</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
        data.blind +
        '<br />' +
        data.text +
        '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
        data.money +
        ' (' +
        data.buyIns +
        ' ' +
        buyInsText +
        ')' +
        '</div></div></div>'
      );
    } else {
      if (data.text == 'Their Turn') {
        if (data.isChecked)
          return (
            '<div class="col s12 m2 opponentCard"><div class="card yellow darken-3"><div class="card-content black-text"><span class="card-title">' +
            name +
            '<br />Check</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br />' +
            data.text +
            '</p></div><div class="card-action yellow lighten-1 black-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        else if (bet == 0) {
          return (
            '<div class="col s12 m2 opponentCard"><div class="card yellow darken-3"><div class="card-content black-text"><span class="card-title">' +
            name +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br />' +
            data.text +
            '</p></div><div class="card-action yellow lighten-1 black-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        } else {
          return (
            '<div class="col s12 m2 opponentCard"><div class="card yellow darken-3"><div class="card-content black-text"><span class="card-title">' +
            name +
            '<br />Bet: $' +
            bet +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br /><br />' +
            data.text +
            '</p></div><div class="card-action yellow lighten-1 black-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        }
      } else {
        if (data.isChecked)
          return (
            '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' +
            name +
            '<br />Check</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br />' +
            data.text +
            '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        else if (bet == 0) {
          return (
            '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' +
            name +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br />' +
            data.text +
            '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        } else {
          return (
            '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' +
            name +
            '<br />Bet: $' +
            bet +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br />' +
            data.text +
            '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
            data.money +
            ' (' +
            data.buyIns +
            ' ' +
            buyInsText +
            ')' +
            '</div></div></div>'
          );
        }
      }
    }
  }
  // buy-ins rendering
  else {
    if (data.text == 'Fold') {
      return (
        '<div class="col s12 m2 opponentCard"><div class="card grey"><div class="card-content white-text"><span class="card-title">' +
        name +
        ' (Fold)</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
        data.blind +
        '<br />' +
        data.text +
        '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
        data.money +
        '</div></div></div>'
      );
    } else {
      if (data.text == 'Their Turn') {
        if (data.isChecked)
          return (
            '<div class="col s12 m2 opponentCard"><div class="card yellow darken-3"><div class="card-content black-text"><span class="card-title black-text">' +
            name +
            '<br />Check</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br />' +
            data.text +
            '</p></div><div class="card-action yellow lighten-1 black-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        else if (bet == 0) {
          return (
            '<div class="col s12 m2 opponentCard"><div class="card yellow darken-3"><div class="card-content black-text"><span class="card-title black-text">' +
            name +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br />' +
            data.text +
            '</p></div><div class="card-action yellow lighten-1 black-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        } else {
          return (
            '<div class="col s12 m2 opponentCard"><div class="card yellow darken-3"><div class="card-content black-text"><span class="card-title black-text">' +
            name +
            '<br />Bet: $' +
            bet +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br /><br />' +
            data.text +
            '</p></div><div class="card-action yellow lighten-1 black-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        }
      } else {
        if (data.isChecked)
          return (
            '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' +
            name +
            '<br />Check</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br />' +
            data.text +
            '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        else if (bet == 0) {
          return (
            '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' +
            name +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br />' +
            data.text +
            '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        } else {
          return (
            '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' +
            name +
            '<br />Bet: $' +
            bet +
            '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' +
            data.blind +
            '<br />' +
            data.text +
            '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
            data.money +
            '</div></div></div>'
          );
        }
      }
    }
  }
}

function renderOpponentCards(name, data) {
  var bet = 0;
  if (data.bets != undefined) {
    var arr = data.bets[data.bets.length - 1].reverse();
    for (var pn = 0; pn < arr.length; pn++) {
      if (arr[pn].player == name) bet = arr[pn].bet;
    }
  }
  var buyInsText2 =
    data.buyIns > 0 ? (data.buyIns > 1 ? 'buy-ins' : 'buy-in') : '';
  if (data.buyIns > 0) {
    if (data.folded)
      return (
        '<div class="col s12 m2 opponentCard"><div class="card grey" ><div class="card-content white-text"><span class="card-title">' +
        name +
        ' | Bet: $' +
        bet +
        '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br /><br /></p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
        data.money +
        ' (' +
        data.buyIns +
        ' ' +
        buyInsText2 +
        ')' +
        '</div></div></div>'
      );
    else
      return (
        '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' +
        name +
        ' | Bet: $' +
        bet +
        '</span><p><div class="center-align"> ' +
        renderOpponentCard(data.cards[0]) +
        renderOpponentCard(data.cards[1]) +
        ' </div><br /><br /><br /><br /><br />' +
        data.endHand +
        '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
        data.money +
        ' (' +
        data.buyIns +
        ' ' +
        buyInsText2 +
        ')' +
        '</div></div></div>'
      );
  } else {
    if (data.folded)
      return (
        '<div class="col s12 m2 opponentCard"><div class="card grey" ><div class="card-content white-text"><span class="card-title">' +
        name +
        ' | Bet: $' +
        bet +
        '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br /><br /></p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
        data.money +
        '</div></div></div>'
      );
    else
      return (
        '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' +
        name +
        ' | Bet: $' +
        bet +
        '</span><p><div class="center-align"> ' +
        renderOpponentCard(data.cards[0]) +
        renderOpponentCard(data.cards[1]) +
        ' </div><br /><br /><br /><br /><br />' +
        data.endHand +
        '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' +
        data.money +
        '</div></div></div>'
      );
  }
}

function renderOpponentCard(card) {
  if (card.suit == '♠' || card.suit == '♣')
    return (
      '<div class="playingCard_black_opponent" id="card"' +
      card.value +
      card.suit +
      '" data-value="' +
      card.value +
      ' ' +
      card.suit +
      '">' +
      card.value +
      ' ' +
      card.suit +
      '</div>'
    );
  else
    return (
      '<div class="playingCard_red_opponent" id="card"' +
      card.value +
      card.suit +
      '" data-value="' +
      card.value +
      ' ' +
      card.suit +
      '">' +
      card.value +
      ' ' +
      card.suit +
      '</div>'
    );
}

function updateBetDisplay() {
  if ($('#betRangeSlider').val() == $('#usernamesMoney').text()) {
    $('#betDisplay').html(
      '<h3 class="center-align">All-In $' +
        $('#betRangeSlider').val() +
        '</h36>'
    );
  } else {
    $('#betDisplay').html(
      '<h3 class="center-align">$' + $('#betRangeSlider').val() + '</h36>'
    );
  }
}

function updateBetModal() {
  $('#betDisplay').html('<h3 class="center-align">$0</h3>');
  document.getElementById('betRangeSlider').value = 0;
  var usernamesMoneyStr = $('#usernamesMoney').text().replace('$', '');
  var usernamesMoneyNum = parseInt(usernamesMoneyStr);
  $('#betRangeSlider').attr({
    max: usernamesMoneyNum,
    min: 0,
  });
}

function updateRaiseDisplay() {
  $('#raiseDisplay').html(
    '<h3 class="center-align">Raise top bet to $' +
      $('#raiseRangeSlider').val() +
      '</h3>'
  );
}

socket.on('updateRaiseModal', function (data) {
  $('#raiseRangeSlider').attr({
    max: data.usernameMoney,
    min: data.topBet,
  });
});

function updateRaiseModal() {
  document.getElementById('raiseRangeSlider').value = 0;
  socket.emit('raiseModalData', {});
}

socket.on('displayPossibleMoves', function (data) {
  if (data.fold == 'yes') $('#usernameFold').show();
  else $('#usernameHide').hide();
  if (data.check == 'yes') $('#usernameCheck').show();
  else $('#usernameCheck').hide();
  if (data.bet == 'yes') $('#usernameBet').show();
  else $('#usernameBet').hide();
  if (data.call != 'no' || data.call == 'all-in') {
    $('#usernameCall').show();
    if (data.call == 'all-in') $('#usernameCall').text('Call All-In');
    else $('#usernameCall').text('Call $' + data.call);
  } else $('#usernameCall').hide();
  if (data.raise == 'yes') $('#usernameRaise').show();
  else $('#usernameRaise').hide();
});

function renderSelf(data) {
  $('#playNext').empty();
  $('#usernamesMoney').text('$' + data.money);
  if (data.text == 'Their Turn') {
    $('#playerInformationCard').removeClass('grey');
    $('#playerInformationCard').removeClass('grey');
    $('#playerInformationCard').addClass('yellow');
    $('#playerInformationCard').addClass('darken-2');
    $('#usernamesCards').removeClass('white-text');
    $('#usernamesCards').addClass('black-text');
    $('#status').text('My Turn');
    Materialize.toast('My Turn', 4000);
    socket.emit('evaluatePossibleMoves', {});
  } else if (data.text == 'Fold') {
    $('#status').text('You Folded');
    $('#playerInformationCard').removeClass('green');
    $('#playerInformationCard').removeClass('yellow');
    $('#playerInformationCard').removeClass('darken-2');
    $('#playerInformationCard').addClass('grey');
    $('#usernamesCards').removeClass('black-text');
    $('#usernamesCards').addClass('white-text');
    Materialize.toast('You folded', 3000);
    $('#usernameFold').hide();
    $('#usernameCheck').hide();
    $('#usernameBet').hide();
    $('#usernameCall').hide();
    $('#usernameRaise').hide();
  } else {
    $('#status').text('');
    $('#usernamesCards').removeClass('black-text');
    $('#usernamesCards').addClass('white-text');
    $('#playerInformationCard').removeClass('grey');
    $('#playerInformationCard').removeClass('yellow');
    $('#playerInformationCard').removeClass('darken-2');
    $('#playerInformationCard').addClass('green');
    $('#playerInformationCard').removeClass('theirTurn');
    $('#usernameFold').hide();
    $('#usernameCheck').hide();
    $('#usernameBet').hide();
    $('#usernameCall').hide();
    $('#usernameRaise').hide();
  }
  $('#blindStatus').text(data.blind);
}
