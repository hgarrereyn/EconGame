var ws = require("nodejs-websocket");
var ClientHandler = require("./clientHandler.js").ClientHandler;
var World = require('./world.js').World;
var Timer = require('./timer.js').Timer;

var world = new World(100,100);
var timer = new Timer();
var clientHandler = new ClientHandler(world, 100);

world.initRound();
world.initItems();


//Broadcast world state at 20Hz
timer.every(50, function (rep) {
	//Broadcast world state
	var worldDelta = world.encodeDelta();
	clientHandler.broadcastRaw(worldDelta);

	//Check and broadcast secrets
	clientHandler.each(function(id, client) {
		var player = world.players[id];

		if (player.hasSecret()) {
			client.sendRaw(player.encodeSecret());
		}

		if (player.points <= 0) {
			//death packet
			client.sendRaw(String.fromCharCode(5));
			client._conn.close();
		}
	});

	//Simulate world state
	world.simulate(.05);

	if (world.newRound) {
		var round = world.encodeRound();
		clientHandler.broadcastRaw(round);
	}
});


var server = ws.createServer(function (conn) {

	clientHandler.connectClient(conn);

}).listen(3001);
