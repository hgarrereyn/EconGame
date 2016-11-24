var Game = function () {
	var controller = new Controller();
	var timer = new Timer();

	this.init = function () {
		controller.init();

		CONN_STATE.messageHandler.registerTrigger('UPDT', function (ws, data) {
			console.log('Game :: Received full state update...');
		});

		CONN_STATE.messageHandler.registerTrigger('DELTA', function (ws, data) {
			ws.send(controller.sample());
		})
	}

	this.run = function () {

	}

}
