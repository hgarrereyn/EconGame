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

	this.send = function (obj) {
		this._conn.sendText(JSON.stringify(obj));
	}
}

var ClientHandler = function (world, maxPlayers) {
	var ch = this;

	this.world = world;
	this.maxPlayers = maxPlayers;

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

		if (ch.clients[id].status == 0) {
			ch.clients[id].completeHandshake(nick);

			//Spawn client in the world
			ch.world.spawn(id, ch.clients[id]);

			console.log('ClientHandler :: Completed handshake with id: [' + id + '] and nick: [' + nick + ']');
		}
	});

	this.generatePlayerId = function () {
		for (var i = 0; i < maxPlayers; ++i) {
			if (ch.clients[i] == undefined) {
				//open slot
				return i;
			}
		}

		return -1;
	}

	//Client triggers are of signature:
	//(id, conn, data)
	this.registerConnectionTriggers = function (client) {
		var id = client.id;
		var _conn = client._conn;

		_conn.on('text', function (msg) {
			var obj = JSON.parse(msg);

			var type = obj.type;
			var data = obj.data;

			if (ch.triggers[type] != undefined) {
				ch.triggers[type](id, _conn, data)
			} else {
				console.log('ClientHandler :: No handler found for message type: [' + type + ']');
			}
		});
	}

	this.connectClient = function (conn) {

		var id = this.generatePlayerId();

		if (id != -1) {

			var client = new Client(id, conn);

			//Start tracking client
			ch.clients[id] = client;

			//Prepare for client close/crash
			conn.on('close', function () {
				console.log('ClientHandler :: client left: [' + id + ']');
				delete ch.clients[id];
				ch.world.removePlayer(id);
			});

			conn.on('error', function (err) {
				console.log('ClientHandler :: [ERROR] client crashed: [' + id + ']');
				delete ch.clients[id];
				ch.world.removePlayer(id);
			})

			//Register triggers for client
			this.registerConnectionTriggers(client);

			//Initiate handshake
			conn.sendText(JSON.stringify({
				type: 'REQUEST_NICK',
				data: {
					id: id
				}
			}));

		} else {

			console.log('ClientHandler :: Client tried to connect, but server is full...');

			conn.sendText(JSON.stringify({
				type: 'SERVER_FULL',
				apology: 'sorry...',
				sad_face: ':('
			}));

			conn.on('close', function () {});

			conn.on('error', function () {});

		}

	}

	this.broadcast = function (obj) {
		for (var id in this.clients) {
			var client = this.clients[id];

			if (client.status == 1) {
				client.send(obj);
			}
		}
	}

}

module.exports = {
	ClientHandler: ClientHandler
}
