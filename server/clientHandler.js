var uuid = require('./uuid.js');

var Client = function (id, conn) {
	//The client's uuid
	this.id = id;

	// status types:
	// 0 - Connecting
	// 1 - Handshake complete, connected
	// 2 - Error / Closing
	this.status = 0;

	//Websocket object
	this._conn = conn;

	this.nick = undefined;

	this.completeHandshake = function (nick) {
		this.status = 1;
		this.nick = nick;
	}
}

var ClientHandler = function () {

	//Structure:
	//
	// uuid : client
	this.clients = {};

	this.triggers = {};

	//Register a message trigger
	this.registerTrigger = function(type, fn) {
		this.triggers[type] = fn;
	}

	this.registerTrigger('PROVIDE_NICK', function (id, conn, data) {
		var nick = data.nick;

		if (this.clients[id].status == 0) {
			this.clients[id].completeHandshake(nick);
		}
	});

	//Client triggers are of signature:
	//(id, conn, data)
	this.registerConnectionTriggers = function (client) {
		var id = client.id;
		var _conn = client._conn;

		_conn.on('text', function (msg) {
			var obj = JSON.parse(msg);

			var type = obj.type;
			var data = obj.data;

			if (this.triggers[type] != undefined) {
				this.triggers[type](id, _conn, data)
			} else {
				console.log('ClientHandler :: No handler found for message type: [' + type + ']');
			}
		});
	}

	this.connectClient = function (conn) {
		//Generate uuid for client
		var id = uuid();

		var client = new Client(id, conn);

		//Start tracking client
		this.clients[id] = client;

		//Register triggers for client
		this.registerConnectionTriggers(client);

		//Initiate handshake
		conn.sendText(JSON.stringify({
			type: 'REQUEST_NICK',
			data: {
				id: id
			}
		}));

	}

}

module.exports = {
	ClientHandler: ClientHandler
}
