//Helper functions

//Encode position per 0.01 units
function _encodePos (p) {
	var m = Math.floor(p * 100);
	m = Math.max(0,m);
	m = Math.min(65535,m); //max two bytes

	t1 = (m & 0xFF00) >> 8; //top part
	t2 = (m & 0xFF); //bottom part

	return [t1, t2];
}

//Encode action bar per 1%
function _encodeActionBar (b) {
	var m = Math.floor(b * 100);
	m = Math.max(0,m);
	m = Math.min(100,m);

	return m;
}

//An entire collection of resources + functions over time
var World = function (width, height) {

	this.width = width;
	this.height = height;

	this.items = {};
	this.players = {};

	/*
	 * 0: News/Allocate ()
	 * 1: Gameplay (3m)
	 * 2: Results (10s)
	 */
	this.state = 0;

	this.spawn = function (id, client) {
		var pos = this._getSpawnLocation();
		var player = new Player(pos, client.nick, client.id);
		this.players[id] = player;

		console.log('World :: Spawned [' + client.nick + '] at [' + pos[0] + ', ' + pos[1] + ']');
	}

	this.initItems = function () {
		for (var i = 0; i < 1000; ++i) {
			var pos = this._getSpawnLocation();
			var type = Math.floor(Math.random() * 4);
			var id = i;

			var item = new Item(pos, type, id);
			this.items[id] = item;
		}
	}

	this.removePlayer = function (id) {
		this.players[id].markForDeletion();
	}

	//TODO: better spawn detection
	this._getSpawnLocation = function () {
		return [Math.random() * this.width, Math.random() * this.height];
	}

	//TODO: Items can't be within 1 unit of eachother
	this._getItemSpawnLocation = function () {
		var x = Math.floor(Math.random() * this.width * 10) / 10;
		var y = Math.floor(Math.random() * this.height * 10) / 10;

		return [x,y];
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

	this.controlSignal = function (id, data) {
		var player = this.players[id];

		player.setControlSignal(data);
	}

	this.simulate = function (dt) {
		//Simulate players
		for (var id in this.players) {
			var player = this.players[id];

			//motion
			var moveV = player.controlSignal.down - player.controlSignal.up;
			var moveH = player.controlSignal.right - player.controlSignal.left;

			player.moveWithBounds(moveH * dt, moveV * dt, 0, 0, this.width, this.height);

			player.actionBar += 0.01;
			player.actionBar %= 1;
			player._actionBarChanged = true;

			if (player._broadcastPlayerKilled) {
				delete this.players[id];
			}
		}
	}

	this.encodeInitial = function () {
		var iString = String.fromCharCode(1);

		var pInitialCount = 0;
		var pInitialString = '';

		for (var id in this.players) {
			pInitialCount++;
			pInitialString += this.players[id].encodeInitial();
		}

		var iInitialCount = 0;
		var iInitialString = '';

		for (var id in this.items) {
			iInitialCount++;
			iInitialString += this.items[id].encodeInitial();
		}

		iString += String.fromCharCode(pInitialCount);
		iString += String.fromCharCode((iInitialCount & 0xFF00) >> 8);
		iString += String.fromCharCode(iInitialCount & 0xFF);
		iString += pInitialString;
		iString += iInitialString;

		return iString;
	}

	this.encodeDelta = function () {
		var dString = String.fromCharCode(0);

		var pDeltaCount = 0;
		var pDeltaString = '';

		for (var id in this.players) {
			if (this.players[id].hasDelta()) {
				pDeltaCount++;
				pDeltaString += this.players[id].encodeDelta();
			}
		}

		var iDeltaCount = 0;
		var iDeltaString = '';

		for (var id in this.items) {
			if (this.items[id].hasDelta()) {
				iDeltaCount++;
				iDeltaString += this.items[id].encodeDelta();
			}
		}

		dString += String.fromCharCode(pDeltaCount);
		dString += String.fromCharCode(iDeltaCount);
		dString += pDeltaString;
		dString += iDeltaString;

		return dString;
	}
}

//A resource in the world
var Item = function (pos, type, id) {
	this.pos = pos;

	//integer from 0 to 3 (inclusive)
	this.type = type;

	//mutually exclusive, max 2 bytes
	this.id = id;

	this._new = true;
	this._consumed = false;

	this.hasDelta = function () {
		return this._new || this._consumed;
	}

	this.encodeInitial = function () {
		var d = [];

		var id1 = (this.id & 0xFF00) >> 8;
		var id2 = (this.id & 0xFF);

		d.push(id1, id2); //id can occupy two bytes
		d.push(..._encodePos(this.pos[0]));
		d.push(..._encodePos(this.pos[1]));
		d.push(this.type);

		return d.map(x => String.fromCharCode(x)).join('');
	}

	this.encodeDelta = function () {
		var d = [];

		var id1 = (this.id & 0xFF00) >> 8;
		var id2 = (this.id & 0xFF);

		d.push(id1, id2); //id can occupy two bytes

		if (this._new) {
			d.push(..._encodePos(this.pos[0]));
			d.push(..._encodePos(this.pos[1]));
			d.push(this.type);

			this._new = false;
		}

		return d.map(x => String.fromCharCode(x)).join('');
	}
}

//An individual player
var Player = function (pos, nick, id) {
	//[x, y]
	this.pos = pos;

	//not necessarily mutually exclusive
	this.nick = nick;

	//mutually exclusive (an integer from 0 to max_players - 1)
	this.id = id;

	//the percentage complete of the action bar
	this.actionBar = 0; //0(empty) to 1(full)

	this.technology = 0; //technology level
	this.workers = 0; //number of workers

	this.controlSignal = {
		up: false,
		left: false,
		right: false,
		down: false,
		action: false
	};

	this._speed = 1;

	//Helper variables for determining delta packets
	this._posXChanged = false;
	this._posYChanged = false;
	this._actionBarChanged = false
	this._animate = false;

	this._new = true; //starts true
	this._playerKilled = false; //or disconnected
	this._broadcastPlayerKilled = false; //true once the kill message has been broadcasted
	this.markForDeletion = function () {this._playerKilled = true;}

	//animations:
	this._animateResourceComplete = false;

	this.moveWithBounds = function (dx, dy, x0, y0, width, height) {
		if (dx != 0) {
			var x = this.pos[0] + (dx * this._speed);
			x = Math.min(Math.max(x0,x),width);

			if (x != this.pos[0]) {
				pos[0] = x;
				this._posXChanged = true;
			}
		}

		if (dy != 0) {
			var y = this.pos[1] + (dy * this._speed);
			y = Math.min(Math.max(y0,y),height);

			if (y != this.pos[1]) {
				pos[1] = y;
				this._posYChanged = true;
			}
		}
	}

	this.setControlSignal = function (signal) {
		var s = signal.charCodeAt(0);

		this.controlSignal.up = s & 1;
		this.controlSignal.left = (s >> 1) & 1;
		this.controlSignal.right = (s >> 2) & 1;
		this.controlSignal.down = (s >> 3) & 1;
		this.controlSignal.action = (s >> 4) & 1;

		//TODO: check for control signals that can't be skipped (for example,
		//if two of these packets comes in at once, the motion controls can be
		//overridden but not others)
	}

	this.hasDelta = function () {
		return (
			   this._posXChanged
			|| this._posYChanged
			|| this._actionBarChanged
			|| this._playerKilled
			|| this._animate
			|| this._new
		)
	}

	this.encodeInitial = function () {
		var d = [];

		d.push(id);
		d.push(this.nick.length);
		d.push(...this.nick.split('').map(x => x.charCodeAt(0)));
		d.push(..._encodePos(this.pos[0]));
		d.push(..._encodePos(this.pos[1]));

		return d.map(x => String.fromCharCode(x)).join('');
	}

	//Return the player's delta packet as a string
	this.encodeDelta = function () {
		//d will store the byte sequence as integers
		var d = [];

		d.push(id);

		var contents = 0;

		if (this._playerKilled) {
			contents += (1 << 7);
			d.push(contents);

			this._broadcastPlayerKilled = true;
		} else if (this._new) {
			contents += (1 << 0); //posX
			contents += (1 << 1); //posY
			contents += (1 << 2); //action_bar
			contents += (1 << 6); //just joined, nick

			d.push(contents);
			d.push(..._encodePos(this.pos[0]));
			d.push(..._encodePos(this.pos[1]));
			d.push(_encodeActionBar(this.actionBar));
			d.push(this.nick.length);
			d.push(...this.nick.split('').map(x => x.charCodeAt(0)));

			this._new = false;
		} else {
			contents += (this._posXChanged << 0);
			contents += (this._posYChanged << 1);
			contents += (this._actionBarChanged << 2);
			contents += (this._animate << 3); //only one animation so far
			d.push(contents);

			if (this._posXChanged) {
				d.push(..._encodePos(this.pos[0]));
				this._posXChanged = false;
			}

			if (this._posYChanged) {
				d.push(..._encodePos(this.pos[1]));
				this._posYChanged = false;
			}

			if (this._actionBarChanged) {
				d.push(_encodeActionBar(this.actionBar));
				this._actionBarChanged = false;
			}

			if (this._animate) {
				var anim = 0;

				anim += (this._animateResourceComplete << 0);

				d.push(anim);

				this._animate = false;
				this._animateResourceComplete = false;
			}
		}

		//convert to a string:
		return d.map(x => String.fromCharCode(x)).join('');
	}

}

module.exports = {
	World: World,
	Item: Item,
	Player: Player
}
