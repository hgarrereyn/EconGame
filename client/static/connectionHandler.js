//List of possible servers
var servers = [
	'10.0.1.41:3001'
];

//An abstraction over the websocket connection
//Register function triggers based on message type
var MessageHandler = function (ws) {
	var mh = this;

	this.ws = ws;

	this.triggers = {};

	//register a trigger
	//fn is of signature: (ws, data) => null
	this.registerTrigger = function (type, fn) {
		this.triggers[type] = fn;
	}

	this.ws.onmessage = function (msg) {
		var type = undefined;
		var data = undefined;

		if (msg.data.charCodeAt(0) == 0) {

			//Delta packet
			type = 'DELTA';
			data = msg.data;

		} else if (msg.data.charCodeAt(0) == 1) {

			//Initial packet
			type = 'INITIAL';
			data = msg.data;

		} else if (msg.data.charCodeAt(0) == 2) {

			//Secret packet
			type = 'SECRET';
			data = msg.data;

		} else if (msg.data.charCodeAt(0) == 3) {

			//Round packet
			type = 'ROUND';
			data = msg.data;

		} else if (msg.data.charCodeAt(0) == 5) {

			type = 'DEATH';
			data = msg.data;

		} else {
			var obj = JSON.parse(msg.data);

			type = obj.type;
			data = obj.data;
		}

		//LOG: console.log("MessageHandler :: Got message of type: " + type);

		if (mh.triggers[type] != undefined) {
			mh.triggers[type](mh.ws, data);
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
				CONN_STATE.id = data.id;

				console.log('ConnectionHandler :: [Status 2] Handshake complete, recieved uuid: [' + CONN_STATE.id + ']');

				initializeGameScreen();

			}

		});

		messageHandler.registerTrigger('SERVER_FULL', function (ws, data) {
			console.log("Server full...");
		});

		messageHandler.registerTrigger('DEATH', function (ws, data) {
			alert('Game over: you ran out of money.');
			location.reload();
		});
	}

	ws.onclose = function () {
		console.log('ConnectionHandler :: Connection closed');
		//alert('Connection closed');
	}

	ws.onerror = function () {
		console.log('ConnectionHandler :: Connection failed');
		//alert('Connection failed');
	}
}
