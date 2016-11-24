var WorldView = function () {

	this.hasState = false;

	this.players = {}
	this.items = {}

	this.removePlayers = [];
	this.removeItems = [];

	this.loadInitial = function (data) {
		var d = data.split('').map(x => x.charCodeAt(0));

		//TODO: maybe don't do a full reset in the future, idk...
		this.players = {};
		this.items = {};

		var pInitialCount = d[1];
		var iInitialCount = (d[2] << 8) + d[3];

		var i = 4;

		for (var player = 0; player < pInitialCount; ++player) {
			var id = d[i++];
			var nick_length = d[i++];
			var nick = data.substr(i, nick_length);
			i += nick_length;

			var posX = ((d[i++] << 8) + (d[i++])) / 100;
			var posY = ((d[i++] << 8) + (d[i++])) / 100;

			var playerView = new PlayerView(id, nick, [posX, posY]);
			this.players[id] = playerView;
		}

		for (var item = 0; item < iInitialCount; ++item) {
			var id = (d[i++] << 8) + d[i++];
			var posX = ((d[i++] << 8) + (d[i++])) / 100;
			var posY = ((d[i++] << 8) + (d[i++])) / 100;
			var type = d[i++];

			var itemView = new ItemView(id, [posX, posY], type);
			this.items[id] = itemView;
		}

		this.hasState = true;
	}

	this.newPlayer = function (data) {

	}

	this.loadDelta = function (data) {
		var d = data.split('').map(x => x.charCodeAt(0));

		var pDeltaCount = d[1];
		var iDeltaCount = d[2];

		var i = 3;

		for (var player = 0; player < pDeltaCount; ++player) {
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

		for (var item = 0; item < iDeltaCount; ++item) {
			var id = (d[i++] << 8) + d[i++];

			if (this.items[id] == undefined) {
				//item was created

				//TODO: spawn animation

				var posX = ((d[i++] << 8) + (d[i++])) / 100;
				var posY = ((d[i++] << 8) + (d[i++])) / 100;
				var type = d[i++];

				var itemView = new ItemView(id, [posX, posY], type);
				this.items[id] = itemView;
			} {
				//item was consumed

				//TODO: destroy animation

				this.items[id] = undefined;
			}


		}
	}

}

var PlayerView = function (id, nick, pos) {
	this.id = id;
	this.nick = nick;
	this.pos = pos;
	this.actionBar = 0;
}

var ItemView = function (id, pos, type) {
	this.id = id;
	this.pos = pos;
	this.type = type;
}
