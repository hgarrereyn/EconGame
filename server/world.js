//An entire collection of resources + functions over time
var World = function (width, height) {

	this.width = width;
	this.height = height;

	this.items = {};
	this.players = {};

	this.addItem = function (id, item) {
		this.items[id] = item;
	}

	this.addPlayer = function (id, player) {
		this.players[id] = player;
	}

	this.removePlayer = function (id) {
		this.players[id] = undefined;
	}

}

//A resource in the world
var Item = function (pos, type) {
	this.pos = pos;
	this.type = type;
}

//An individual player
var Player = function (pos, vel, nick, attr) {
	this.pos = pos;
	this.vel = vel;
	this.nick = nick;
	this.attr = attr;

	this.moveWithBounds = function (width, height) {
		this.pos[0] += this.vel[]
	}
}
