var Game = function () {

	var that = this;

	this.controller = new Controller();
	this.timer = new Timer();
	this.worldView = new WorldView();

	this.init = function () {
		that.controller.init();

		CONN_STATE.messageHandler.registerTrigger('INITIAL', function (ws, data) {
			that.worldView.loadInitial(data);
		});

		CONN_STATE.messageHandler.registerTrigger('DELTA', function (ws, data) {
			that.worldView.loadDelta(data);
			ws.send(that.controller.sample());
		})
	}

	this.run = function () {

	}

}
