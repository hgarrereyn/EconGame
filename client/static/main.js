var CONN_STATE = {
	//Status:
	//0 - Not Connected
	//1 - Connecting
	//2 - Handshake complete, connected
	status: 0,

	//The websocket object
	_ws: undefined,

	//This client's nick
	nick: undefined,

	//This client's uuid (provided by the server during handshake)
	id: undefined,

	//The message handler for the client's connection
	messageHandler: undefined
};

//Hook onto play button
$('#play_button').click(function () {

	var server = servers[0]; //TODO: pick random server from list (or test each)
	var nick = $('#nick').val();

	connect(nick, server);

});

var _game = undefined;

//Hide the lobby and show the game screen
function initializeGameScreen(){
	$('#lobby_screen').removeClass('active');
	$('#game_screen').addClass('active');

	$('#nick_tag').text(CONN_STATE.nick);
	$('#id_tag').text(CONN_STATE.id);

	//Pass control to game.js
	_game = new Game();
	_game.init();
}
