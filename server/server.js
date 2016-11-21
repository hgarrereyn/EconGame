var ws = require("nodejs-websocket");
var clientHandler = require("./clientHandler.js");

var ch = new clientHandler.ClientHandler();



var server = ws.createServer(function (conn) {

	ch.connectClient(conn);

    conn.on("close", function (code, reason) {
        console.log("Connection closed")
    })

	conn.on('error', function (err) {
		console.log(err);
	})

}).listen(3001);
