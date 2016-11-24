var WorldView = function () {

	this.hasState = false;

	this.players = {}
	this.items = {}

	this.removePlayers = [];
	this.removeItems = [];

	this.loadFullState = function (data) {

	}

	this.newPlayer = function (data) {

	}

	this.loadDelta = function (data) {
		var d = data.split('').map(x => x.charCodeAt(0));

		var pDeltaCount = d[1];
		var iDeltaCount = d[2];

		var i = 3;

		for (var p = 0; p < pDeltaCount; ++p) {
			var id = d[i++];

			var playerView = this.players[id];

			var contents = d[i++];

			var _posX = (contents & 0b1);
			var _posY = (contents & 0b10);
			var _actionBar = (contents & 0b100);
			//var _animation = (contents & 0b1000);

			//var _playerDied = (contents & 0b1000000);

			if (_posX) {
				var posX = ((d[i++] << 8) + (d[i++])) / 100;
				playerView.pos[0] = posX;
			}

			if (_posY) {
				var posY = ((d[i++] << 8) + (d[i++])) / 100;
				playerView.pos[1] = posY;
			}

			if (_actionBar) {
				var actionBar = (d[i++] / 100)
				playerView.actionBar = actionBar;
			}
		}
	}

}

var PlayerView = function (id, pos, nick) {
	this.id = id;
	this.nick = nick;

	this.pos = pos;
	this.actionBar = 0;
}

var ItemView = function (id, pos) {
	this.id = id;
	this.pos = pos;
}
