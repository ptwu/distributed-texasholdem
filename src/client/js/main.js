var socket = io('http://localhost:3000');
var gameInfo = null;

socket.on("hostRoom", function (data) {
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

});

socket.on("joinRoom", function (data) {
	if (data == undefined) {
		alert('Invalid code! Not sure if that room exists.');
	} else {
		$('#joinModalContent').html('<h5>' + data.host + '\'s room</h5><hr /><h5>Players Currently in Room</h5><p>Please wait until your host starts the game.</p>');
		$('#playersNamesJoined').html(data.players.map(function (p) {
			return '<span>' + p + '</span><br />';
		}));
	}
});

socket.on("gameBegin", function (data) {
	console.log('game start');
	$('#hostModal').closeModal();
	$('#joinModal').closeModal();
	if (data == undefined) {
		alert('Error - invalid game.');
	} else {
		$('#mainContent').html();
	}
});

var beginHost = function () {
	if ($('#hostName-field').val() == "") {
		alert('Enter a valid name!');
	} else {
		socket.emit('host', { username: $('#hostName-field').val() });
	}
}

var joinRoom = function () {
	if ($('#joinName-field').val() == "" || $('#code-field').val() == "") {
		alert('Enter a valid name/code!');
	} else {
		socket.emit('join', { code: $('#code-field').val(), username: $('#joinName-field').val() });
	}
}

var startGame = function (gameCode) {
	socket.emit('startGame', { code: gameCode });
}

$(document).ready(function () {
	$('.modal-trigger').leanModal();
});

function renderCard(card) {
	return '<div class="playingCard" id="card"' + card.value + card.suit + '" data-value="' + card.value + " " + card.suit + '">' + card.value + " " + card.suit + '</div>';
}

function renderOpponent(name) {
	return '<div class="col m2"><div class="card green darken-2"><div class="card-content white-text"><span class="card-title" >' + name + '</span>	<div id="mycards"></div><div class="blankCard" id="opponent-card"></div><div class="blankCard" id="opponent-card"></div></div></div></div>';
}