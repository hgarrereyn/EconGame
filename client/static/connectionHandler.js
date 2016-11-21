//List of possible servers
var servers = [
	'localhost:3001'
];

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
	uuid: undefined,

	//The message handler for the client's connection
	messageHandler: undefined
};

//Hook onto play button
$('#play_button').click(function () {

	var server = servers[0];
	var nick = $('#nick').val();

	connect(nick, server);

});

//An abstraction over the websocket connection
//Register function triggers based on message type
var MessageHandler = function (ws) {
	this.ws = ws;

	this.triggers = {};

	//register a trigger
	//fn is of signature: (ws, data) => null
	this.registerTrigger = function (type, fn) {
		this.triggers[type] = fn;
	}

	this.ws.onmessage = function (msg) {
		var obj = JSON.parse(msg);

		var type = obj.type;
		var data = obj.data;

		console.log("MessageHandler :: Got message of type: " + type);

		if (this.triggers[type] != undefined) {
			this.triggers[type](this.ws, data);
		} else {
			console.log("MessageHandler :: [ERROR] No attatched handler for message type!");
		}
	}
}

//Attempt to log on to a server
function connect(nick, server) {
	console.log('ConnectionHandler :: [Status 0] Connecting to server: [' + server + '] with nick: [' + nick + ']...');
	var ws = new WebSocket('ws://' + server)

	ws.onopen = function () {
		console.log('ConnectionHandler :: [Status 1] Websocket connected, waiting for handshake...');

		CONN_STATE.status = 1;
		CONN_STATE._ws = ws;
		CONN_STATE.nick = nick;

		var messageHandler = new MessageHandler(ws);
		CONN_STATE.messageHandler = messageHandler;

		messageHandler.registerTrigger("REQUEST_NICK", function (ws, data) {

			if (CONN_STATE.status == 1) {

				ws.send(JSON.stringify({
					type: 'PROVIDE_NICK',
					data: {
						nick: CONN_STATE.nick
					}
				}));

				CONN_STATE.status = 2;
				CONN_STATE.uuid = data.uuid;

				console.log('ConnectionHandler :: [Status 2] Handshake complete, recieved uuid: [' + CONN_STATE.uuid + ']');

				initializeGameScreen();

			}

		});
	}

	ws.onclose = function () {
		console.log('Connection closed');
	}
}

//Hide the lobby and show the game screen
function initializeGameScreen(){
	$('#lobby_screen').removeClass('active');
	$('#game_screen').addClass('active');
}
