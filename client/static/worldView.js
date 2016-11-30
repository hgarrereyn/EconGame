var WorldView = function () {

	this.players = {}
	this.items = {}

	this.addPlayers = [];
	this.addItems = [];

	this.removePlayers = [];
	this.removeItems = [];

	this.roundProgress = 0;
	this.canSendControl = true;
	this.shouldShowMarket = false;
	this.playerCount = 0;

	this.baseNews = [];
	this.news = [];

	//from last round:
	this.price0 = 0;
	this.price1 = 0;
	this.price2 = 0;
	this.price3 = 0;

	this.priceLabor = 0;
	this.priceLaborInitial = 0;
	this.priceCapital = 0;
	this.priceCapitalInitial = 0;
	this.priceFixed = 0;

	//from this round:
	this.newPriceLabor = 0;
	this.newPriceLaborInitial = 0;
	this.newPriceCapital = 0;
	this.newPriceCapitalInitial = 0;
	this.newPriceFixed = 0;

	this.destroyPlayer = function (id) {
		delete this.players[id];
	}

	this.destroyItem = function (id) {
		delete this.items[id];
	}

	this.investmentPacket = function (workers, technology) {
		var d = [0b10000000];
		d.push(workers);
		d.push(technology);
		return d.map(x => String.fromCharCode(x)).join('');
	}

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
			this.addPlayers.push(id);
		}

		for (var item = 0; item < iInitialCount; ++item) {
			var id = (d[i++] << 8) + d[i++];
			var posX = ((d[i++] << 8) + (d[i++])) / 100;
			var posY = ((d[i++] << 8) + (d[i++])) / 100;
			var type = d[i++];

			var itemView = new ItemView(id, [posX, posY], type);
			this.items[id] = itemView;
			this.addItems.push(id);
		}
	}

	this.loadDelta = function (data) {
		var d = data.split('').map(x => x.charCodeAt(0));

		var pDeltaCount = d[1];
		var iDeltaCount = d[2];

		var i = 3;

		for (var player = 0; player < pDeltaCount; ++player) {
			var id = d[i++];

			var contents = d[i++];

			var _posX = (contents & (1 << 0));
			var _posY = (contents & (1 << 1));
			var _actionBar = (contents & (1 << 2));
			//var _animation = (contents & 0b1000);
			var _new = (contents & (1 << 6));
			var _playerKilled = (contents & (1 << 7));

			var posX = undefined;
			var posY = undefined;
			var actionBar = undefined;
			var nick = undefined;

			if (_posX) {
				posX = ((d[i++] << 8) + (d[i++])) / 100;
			}

			if (_posY) {
				posY = ((d[i++] << 8) + (d[i++])) / 100;
			}

			if (_actionBar) {
				actionBar = (d[i++] / 100);
			}

			if (_new) {
				var nick_length = d[i++];
				nick = data.substr(i,nick_length);
				i += nick_length;
			}

			if (_new) {
				//make sure this isn't a sneaky duplicate

				if (this.addPlayers.indexOf(id) == -1 && this.players[id] == undefined) {
					this.addPlayers.push(id);
				}

				var playerView = new PlayerView(id, nick, [posX, posY]);
				playerView.actionBar = actionBar;
				this.players[id] = playerView;

			} else if (_playerKilled) {

				var playerView = this.players[id];
				playerView.killed = true; //the Game object will graphically represent this and then destroy the player

			} {

				var playerView = this.players[id];
				if (_posX) playerView.pos[0] = posX;
				if (_posY) playerView.pos[1] = posY;
				if (_actionBar) playerView.actionBar = actionBar;

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

				if (this.addItems.indexOf(id) == -1) {
					this.addItems.push(id);
				}
			} {
				//item was consumed

				//TODO: destroy animation

				this.items[id].consumed = true;
			}


		}

		this.roundProgress = d[i++];

		this.playerCount = d[i++];
	}

	this.loadSecret = function (data) {
		var d = data.split('').map(x => x.charCodeAt(0));

		var i = 1;

		var points = 0;
		for (var b = 0; b < 4; ++b) {
			points += (d[i++] << ((3-b) * 8));
		}

		var inventory = [];
		for (var inv = 0; inv < 4; ++inv) {
			inventory.push( (d[i++] << 8) + d[i++] );
		}

		var technology = d[i++];

		var workers = d[i++];

		var playerView = this.players[CONN_STATE.id];
		playerView.points = points;
		playerView.inventory = inventory;
		playerView.technology = technology;
		playerView.workers = workers;
	}

	this.loadRound = function (data) {
		//Immobilize the player until an investment packet is sent
		this.canSendControl = false;
		this.shouldShowMarket = true;

		var d = data.split('').map(x => x.charCodeAt(0));

		var i = 1;

		this.price0 = d[i++];
		this.price1 = d[i++];
		this.price2 = d[i++];
		this.price3 = d[i++];

		this.priceLaborInitial = d[i++];
		this.priceLabor = d[i++];
		this.priceCapitalInitial = d[i++];
		this.priceCapital = d[i++];
		this.priceFixed = d[i++];

		this.newPriceLaborInitial = d[i++];
		this.newPriceLabor = d[i++];
		this.newPriceCapitalInitial = d[i++];
		this.newPriceCapital = d[i++];
		this.newPriceFixed = d[i++];

		var numNews = d[i++];

		var news = [];

		for (var n = 0; n < numNews; ++n) {
			var length = d[i++];

			news.push(data.substr(i, length));
			i += length;
		}

		this.news = news;
	}
}

var PlayerView = function (id, nick, pos) {
	this.id = id;
	this.nick = nick;

	this.pos = pos;
	this.trackingPos = [pos[0], pos[1]];

	this.actionBar = 0;
	this.trackingActionBar = 0;

	this.killed = false;

	this.points = 100;
	this.inventory = [0,0,0,0];
	this.technology = 0;
	this.workers = 0;

	this.firstRound = true;
}

var ItemView = function (id, pos, type) {
	this.id = id;
	this.pos = pos;
	this.type = type;

	this.consumed = false;
}
