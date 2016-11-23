var Game = function () {
	var controller = new Controller();

	this.init = function () {
		controller.init();

		CONN_STATE.messageHandler.registerTrigger('UPDT', function (ws, data) {
			console.log('Game :: Received full state update...');

			
		});
	}

}
