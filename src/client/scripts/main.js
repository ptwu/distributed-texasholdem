
function renderCard(card) {
	return '<div class="card" id="card"' + card.value + card.suit + '" data-value="' + card.value + " " + card.suit + '">' + card.value + " " + card.suit + '</div>';
}