$(document).ready(function () {
	$('#gameDiv').hide();
	$('.modal-trigger').leanModal();
	$('.tooltipped').tooltip({ delay: 50 });
});

var socket = io('http://localhost:3000');
var gameInfo = null;

socket.on("hostRoom", function (data) {
	if (data != undefined) {
		if (data.players.length >= 11) {
			$('#hostModalContent').html('<h5>Code:</h5><code>' + data.code + '</code><br /><h5>Warning: you have too many players in your room. Max is 11.</h5><h5>Players Currently in My Room</h5>');
			$('#playersNames').html(data.players.map(function (p) {
				return '<span>' + p + '</span><br />';
			}));
		} else if (data.players.length > 1) {
			$('#hostModalContent').html('<h5>Code:</h5><code>' + data.code + '</code><br /><h5>Players Currently in My Room</h5>');
			$('#playersNames').html(data.players.map(function (p) {
				return '<span>' + p + '</span><br />';
			}));
			$('#startGameArea').html('<br /><button onclick=startGame(' + data.code + ') type="submit" class= "waves-effect waves-light green darken-3 white-text btn-flat">Start Game</button >');
		} else {
			$('#hostModalContent').html('<h5>Code:</h5><code>' + data.code + '</code><br /><h5>Players Currently in My Room</h5>');
			$('#playersNames').html(data.players.map(function (p) {
				return '<span>' + p + '</span><br />';
			}));
		}
	} else {
		Materialize.toast('Enter a valid name! (max length of name is 12 characters)', 4000);
		$("#joinButton").removeClass("disabled");
	}
});

socket.on("joinRoom", function (data) {
	if (data == undefined) {
		Materialize.toast('Enter a valid name/code! (max length of name is 12 characters & cannot be the same as someone else\'s)', 4000);
		$("#hostButton").removeClass("disabled");
	} else {
		$('#joinModalContent').html('<h5>' + data.host + '\'s room</h5><hr /><h5>Players Currently in Room</h5><p>Please wait until your host starts the game.</p>');
		$('#mainContent').html('<p></p>');
		$('#playersNamesJoined').html(data.players.map(function (p) {
			return '<span>' + p + '</span><br />';
		}));
	}
});

socket.on("dealt", function (data) {
	$('#mycards').html(data.cards.map(function (c) { return renderCard(c); }));
	$('#usernamesCards').text(data.username + " - My Cards");
});

socket.on("rerender", function (data) {
	console.log(JSON.stringify(data));
	if (data.myBet == 0) {
		$('#usernamesCards').text(data.username + " - My Cards");
	} else {
		$('#usernamesCards').text(data.username + " - My Bet: $" + data.myBet);
	}
	if (data.community != undefined) $('#communityCards').html(data.community.map(function (c) { return renderCard(c); }));
	else $('#communityCards').html('<p></p>');
	if (data.currBet == undefined) data.currBet = 0;
	$('#table-title').text('Round ' + data.round + "    |    " + data.stage + "    |    Current Top Bet: $" + data.topBet + "    |    Pot: $" + data.pot);
	$('#opponentCards').html(data.players.map(function (p) { return (p.username != data.username ? renderOpponent(p.username, { 'text': p.status, 'money': p.money, 'blind': p.blind, 'bets': data.bets }) : '&nbsp;') }));
	renderSelf({ 'money': data.myMoney, 'text': data.myStatus, 'blind': data.myBlind, 'bets': data.bets });
});

socket.on("wait", function (data) {
	setTimeout(function () { console.log('sleeping'), 5000 });
});

socket.on("gameBegin", function (data) {
	$('#joinModal').closeModal();
	$('#hostModal').closeModal();
	if (data == undefined) {
		alert('Error - invalid game.');
	} else {
		$('#gameDiv').show();
	}
});

socket.on("reveal", function (data) {
	$('#opponentCards').html(data.cards.map(function (p) { return ((p.username != data.username) ? renderOpponentCards(p.username, { 'cards': p.cards, 'folded': p.folded, 'money': p.money }) : '&nbsp;') }));
});

var beginHost = function () {
	if ($('#hostName-field').val() == "") {
		$('.toast').hide();
		Materialize.toast('Enter a valid name! (max length of name is 12 characters)', 4000);
		$("#joinButton").removeClass("disabled");
	} else {
		socket.emit('host', { username: $('#hostName-field').val() });
	}
	$("#joinButton").addClass("disabled");
	$('#joinButton').off('click');
}

var joinRoom = function () {
	if ($('#joinName-field').val() == "" || $('#code-field').val() == "" || $('#joinName-field').val().length > 12) {
		$('.toast').hide();
		Materialize.toast('Enter a valid name/code! (max length of name is 12 characters.)', 4000);
		$("#hostButton").removeClass("disabled");
	} else {
		socket.emit('join', { code: $('#code-field').val(), username: $('#joinName-field').val() });
	}
	$("#hostButton").addClass("disabled");
	$('#hostButton').off('click');
}

var startGame = function (gameCode) {
	socket.emit('startGame', { code: gameCode });
}

var fold = function () {
	socket.emit('moveMade', { move: 'fold', bet: 'Fold' });
}

var bet = function () {
	if (parseInt($("#betRangeSlider").val()) == 0) {
		Materialize.toast('You must bet more than $0! Try again.', 4000);
	} else {
		socket.emit('moveMade', { move: 'bet', bet: parseInt($("#betRangeSlider").val()) });
	}
}

var call = function () {
	socket.emit('moveMade', { move: 'call', bet: 'Call' });
}

var check = function () {
	socket.emit('moveMade', { move: 'check', bet: 'Check' });
}

var raise = function () {
	if (parseInt($("#raiseRangeSlider").val()) == $("#raiseRangeSlider").prop('min')) {
		Materialize.toast('You must raise higher than the current top bet! Try again.', 4000);
	} else {
		socket.emit('moveMade', { move: 'raise', bet: parseInt($("#raiseRangeSlider").val()) });
	}
}

function renderCard(card) {
	if (card.suit == '♠' || card.suit == '♣')
		return '<div class="playingCard_black" id="card"' + card.value + card.suit + '" data-value="' + card.value + " " + card.suit + '">' + card.value + " " + card.suit + '</div>';
	else
		return '<div class="playingCard_red" id="card"' + card.value + card.suit + '" data-value="' + card.value + " " + card.suit + '">' + card.value + " " + card.suit + '</div>';
}

function renderOpponent(name, data) {
	var bet = 0;
	if (data.bets != undefined) {
		var arr = data.bets[data.bets.length - 1];
		for (var pn = 0; pn < arr.length; pn++) {
			if (arr[pn].player == name)
				bet = arr[pn].bet;
		}
	}
	if (data.text == 'Fold') {
		return '<div class="col s12 m2 opponentCard"><div class="card grey"><div class="card-content white-text"><span class="card-title">' + name + ' (Fold)</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' + data.blind + '<br />' + data.text + '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' + data.money + '</div></div></div>';
	} else {
		if (data.text == 'Their Turn') {
			if (bet == 0) {
				return '<div class="col s12 m2 opponentCard"><div class="card green"><div class="card-content white-text"><span class="card-title">' + name + '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' + data.blind + '<br />' + data.text + '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' + data.money + '</div></div></div>';
			} else {
				return '<div class="col s12 m2 opponentCard"><div class="card green"><div class="card-content white-text"><span class="card-title">' + name + ' | Bet: $' + bet + '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' + data.blind + '<br />' + data.text + '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' + data.money + '</div></div></div>';
			}
		} else {
			if (bet == 0) {
				return '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' + name + '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' + data.blind + '<br />' + data.text + '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' + data.money + '</div></div></div>';
			} else {
				return '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' + name + ' | Bet: $' + bet + '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' + data.blind + '<br />' + data.text + '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' + data.money + '</div></div></div>';
			}
		}
	}
}

function renderOpponentCards(name, data) {
	var bet = 0;
	if (data.bets != undefined) {
		var arr = data.bets[data.bets.length - 1].reverse();
		for (var pn = 0; pn < arr.length; pn++) {
			if (arr[pn].player == name)
				bet = arr[pn].bet;
		}
	}
	if (data.folded) return '<div class="col s12 m2 opponentCard"><div class="card grey" ><div class="card-content white-text"><span class="card-title">' + name + ' | Bet: $' + bet + '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br /><br /></p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' + data.money + '</div></div></div>';
	else return '<div class="col s12 m2 opponentCard"><div class="card green darken-2" ><div class="card-content white-text"><span class="card-title">' + name + ' | Bet: $' + bet + '</span><p><div class="center-align"> ' + renderOpponentCard(data.cards[0]) + renderOpponentCard(data.cards[1]) + ' </div><br /><br /><br /><br /><br /><br /></p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' + data.money + '</div></div></div>';
}

function renderOpponentCard(card) {
	if (card.suit == '♠' || card.suit == '♣')
		return '<div class="playingCard_black_opponent" id="card"' + card.value + card.suit + '" data-value="' + card.value + " " + card.suit + '">' + card.value + " " + card.suit + '</div>';
	else
		return '<div class="playingCard_red_opponent" id="card"' + card.value + card.suit + '" data-value="' + card.value + " " + card.suit + '">' + card.value + " " + card.suit + '</div>';
}

function updateBetDisplay() {
	$('#betDisplay').html('<h3 class="center-align">$' + $("#betRangeSlider").val() + '</h36>')
}

function updateBetModal() {
	var usernamesMoneyStr = $('#usernamesMoney').text().replace('$', '');
	var usernamesMoneyNum = parseInt(usernamesMoneyStr);
	$("#betRangeSlider").attr({
		"max": usernamesMoneyNum,
		"min": 0
	});
}

function updateRaiseDisplay() {
	$('#raiseDisplay').html('<h3 class="center-align">Raise top bet to $' + $("#raiseRangeSlider").val() + '</h3>')
}

socket.on("updateRaiseModal", function (data) {
	$("#raiseRangeSlider").attr({
		"max": data.usernameMoney,
		"min": data.topBet
	});
});

function updateRaiseModal() {
	socket.emit('raiseModalData', {});
}

socket.on("displayPossibleMoves", function (data) {
	if (data.fold == 'yes') $("#usernameFold").show();
	else $("#usernameHide").hide();
	if (data.check == 'yes') $("#usernameCheck").show();
	else $("#usernameCheck").hide();
	if (data.bet == 'yes') $("#usernameBet").show();
	else $("#usernameBet").hide();
	if (data.call == 'yes' || data.call == 'all-in') {
		$("#usernameCall").show();
		if (data.call == 'all-in') $("#usernameCall").text('Call All-In');
		else $("#usernameCall").text('Call')
	} else $("#usernameCall").hide();
	if (data.raise == 'yes') $("#usernameRaise").show();
	else $("#usernameRaise").hide();
});

function renderSelf(data) {
	$('#usernamesMoney').text("$" + data.money);
	if (data.text == 'Their Turn') {
		$("#playerInformationCard").removeClass('grey');
		$("#playerInformationCard").addClass('green');
		$("#playerInformationCard").addClass('theirTurn');
		$("#status").text('My Turn');
		Materialize.toast('My Turn', 4000);
		socket.emit('evaluatePossibleMoves', {});
	} else if (data.text == 'Fold') {
		$("#status").text('You Folded');
		$("#playerInformationCard").removeClass('theirTurn');
		$("#playerInformationCard").removeClass('green');
		$("#playerInformationCard").addClass('grey');
		Materialize.toast('You folded', 3000);
		$("#usernameFold").hide();
		$("#usernameCheck").hide();
		$("#usernameBet").hide();
		$("#usernameCall").hide();
		$("#usernameRaise").hide();
	} else {
		$("#status").text('');
		$("#playerInformationCard").removeClass('grey');
		$("#playerInformationCard").addClass('green');
		$("#playerInformationCard").removeClass('theirTurn');
		$("#usernameFold").hide();
		$("#usernameCheck").hide();
		$("#usernameBet").hide();
		$("#usernameCall").hide();
		$("#usernameRaise").hide();
	}
	$('#blindStatus').text(data.blind);
}