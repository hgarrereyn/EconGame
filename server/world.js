//An entire collection of resources + functions over time
var World = function (width, height) {

	this.width = width;
	this.height = height;

	this.items = {};
	this.players = {};

	this.spawn = function (id, client) {
		var pos = this._getSpawnLocation();
		var player = new Player(pos, client.nick, client.id);
		this.players[id] = player;

		console.log('World :: Spawned [' + client.nick + '] at [' + pos[0] + ', ' + pos[1] + ']');
	}

	this.removePlayer = function (id) {
		delete this.players[id];
	}

	this._getSpawnLocation = function () {
		return [Math.random() * this.width, Math.random() * this.height];
	}

	this.addItem = function (id, item) {
		this.items[id] = item;
	}

	this.exportAll = function () {
		return {
			items: this.items,
			players: this.players
		}
	}
}

//A resource in the world
var Item = function (pos, type) {
	this.pos = pos;
	this.type = type;
}

//An individual player
var Player = function (pos, nick, id) {
	this.pos = pos;
	this.nick = nick;
	this.id = id;

	this.action_bar = 0; //0(empty) to 1(full)
	this.attr = {
		speed: 1,
		visibility: 1
	};

	this._lastControl = 0; //last 
}

module.exports = {
	World: World,
	Item: Item,
	Player: Player
}
