
function renderCard(card) {
	return '<div class="playingCard" id="card"' + card.value + card.suit + '" data-value="' + card.value + " " + card.suit + '">' + card.value + " " + card.suit + '</div>';
}

function renderOpponent(name) {
	return '<div class="col m2"><div class="card green darken-2"><div class="card-content white-text"><span class="card-title" >' + name + '</span>	<div id="mycards"></div><div class="blankCard" id="opponent-card"></div><div class="blankCard" id="opponent-card"></div></div></div></div>';
}