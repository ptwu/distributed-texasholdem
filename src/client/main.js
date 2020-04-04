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
	$('#mycards').html(data.cards.map(function (c, i) { return renderCard(c, i); }));
	$('#usernamesCards').text(data.username + " - My Cards");
	$('#opponentCards').html(data.players.map(function (p) { return (p != data.username ? renderOpponent(p, { 'text': 'Waiting...', 'money': 100 }) : '&nbsp;') }));
	renderSelf({ 'money': 100, 'text': 'Not Their Turn' });
});

socket.on("rerender", function (data) {
	$('#table-title').text('Round ' + data.round + " | " + data.stage + " | Pot: " + data.pot);
	$('#opponentCards').html(data.players.map(function (p) { return (p != data.username ? renderOpponent(p, { 'text': ' Buy-ins', 'money': 100 }) : '&nbsp;') }));
	renderSelf({ 'money': data.myMoney, 'text': data.myStatus });
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

function renderCard(card) {
	if (card.suit == '♠' || card.suit == '♣')
		return '<div class="playingCard_black" id="card"' + card.value + card.suit + '" data-value="' + card.value + " " + card.suit + '">' + card.value + " " + card.suit + '</div>';
	else
		return '<div class="playingCard_red" id="card"' + card.value + card.suit + '" data-value="' + card.value + " " + card.suit + '">' + card.value + " " + card.suit + '</div>';
}

function renderOpponent(name, data) {
	return '<div class="col s12 m2"><div class="card green darken-2"><div class="card-content white-text"><span class="card-title">' + name + '</span><p><div class="center-align"><div class="blankCard" id="opponent-card" /><div class="blankCard" id="opponent-card" /></div><br /><br /><br /><br /><br />' + data.text + '</p></div><div class="card-action green darken-3 white-text center-align" style="font-size: 20px;">$' + data.money + '</div></div></div>';
}

function renderSelf(data) {
	$('#usernamesMoney').text("$" + data.money);
	if (data.text != 'Their Turn') {
		$("#usernameFold").prop('disabled', true);
		$("#usernameCheck").prop('disabled', true);
		$("#usernameCall").prop('disabled', true);
		$("#usernameRaise").prop('disabled', true);
	} else {
		$("#usernameFold").prop('disabled', false);
		$("#usernameCheck").prop('disabled', false);
		$("#usernameCall").prop('disabled', false);
		$("#usernameRaise").prop('disabled', false);
	}
}