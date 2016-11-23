var ws = require("nodejs-websocket");
var ClientHandler = require("./clientHandler.js").ClientHandler;
var World = require('./world.js').World;
var Timer = require('./timer.js').Timer;

var world = new World(100,100);
var timer = new Timer();
var clientHandler = new ClientHandler(world, 100);


//Broadcast world state at 20Hz
timer.every(50, function (rep) {
	var worldMessage = {
		type: 'UPDT',
		data: {
			world: world.exportAll(),
			frame: rep
		}
	};
	clientHandler.broadcast(worldMessage);
});


var server = ws.createServer(function (conn) {

	clientHandler.connectClient(conn);

}).listen(3001);
