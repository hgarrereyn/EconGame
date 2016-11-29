var Scenario = require('./scenario.js');

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

var _spawnPoints = 100;

var _initialFarmingTime = 10; //5 seconds
var _initialInventory = 10; //inventory farmed
var _inventoryDeviation = 0.2; //inv +- 10%

//Time to complete as a function of tech level
function _timeToComplete (technology) {
	return _initialFarmingTime / (1 + (technology/3));
}

function _inventoryFarmed (workers) {
	var inv = ((1 + Math.log(workers + 1)) * _initialInventory) * ((Math.random() * _inventoryDeviation * 2) - _inventoryDeviation + 1);
	inv = Math.floor(inv);

	return inv;
}

//An entire collection of resources + functions over time
var World = function (width, height) {

	this.width = width;
	this.height = height;

	this.items = {};
	this.players = {};

	//the simulate() method adds ids to this list and clears it once these
	//objects have broadasted their state (which happens in the next loop)
	this.itemsToRemove = [];
	this.playersToRemove = [];

	this.scenario = undefined;
	this.newRound = false;
	this.timeElapsed = 0; //time elapsed in this round (in seconds)
	this.roundDuration = 100; //seconds

	this.spawn = function (id, client) {
		var pos = this._getPlayerSpawnLocation();
		var player = new Player(pos, client.nick, client.id);
		this.players[id] = player;

		console.log('World :: Spawned [' + client.nick + '] at [' + pos[0] + ', ' + pos[1] + ']');
	}

	this.initRound = function () {
		this.timeElapsed = 0;
		this.scenario = new Scenario();
		this.newRound = true; //flag so new round gets broadcast
	}

	//Temporary
	this.initItems = function () {
		for (var i = 0; i < 1000; ++i) {
			var pos = this._getItemSpawnLocation();
			var type = Math.floor(Math.random() * 4);
			var id = i;

			var item = new Item(pos, type, id);
			this.items[id] = item;
		}
	}

	//Mark a player for deletion
	this.deletePlayer = function (id) {
		this.players[id].markForDeletion();
		this.playersToRemove.push(id);
	}

	//Mark an item for deletion
	this.deleteItem = function (id) {
		this.items[id].markForDeletion();
		this.itemsToRemove.push(id);
	}

	//TODO: better spawn detection
	this._getPlayerSpawnLocation = function () {
		return [Math.random() * this.width, Math.random() * this.height];
	}

	//TODO: Items can't be within 1 unit of eachother
	this._getItemSpawnLocation = function () {
		var x = Math.floor(Math.random() * this.width * 10) / 10;
		var y = Math.floor(Math.random() * this.height * 10) / 10;

		return [x,y];
	}

	//Returns the id of an object within 0.5 units of player, or -1 if no item
	//can be found
	//
	//TODO: Store items in chuncks to speed up search algorithm
	this._getItemInRange = function (player) {
		var pos = player.pos;

		//test _lastItem first
		if (player._lastItem != -1) {
			var item = this.items[player._lastItem];
			var dx = item.pos[0] - pos[0];
			var dy = item.pos[1] - pos[1];

			if (0.25 >= (dx * dx) + (dy * dy)) {
				return player._lastItem;
			}
		}

		//test other items
		for (var id in this.items) {
			var item = this.items[id];
			var dx = item.pos[0] - pos[0];
			var dy = item.pos[1] - pos[1];

			if (0.25 >= (dx * dx) + (dy * dy)) {
				return id;
			}
		}

		return -1;
	}

	/*
	this.addItem = function (id, item) {
		this.items[id] = item;
	}
	*/

	//This method forwards the control signal from a client to its corresponding
	//player object, which will store it for simulation
	this.controlSignal = function (id, data) {
		var player = this.players[id];
		player.setControlSignal(data);
	}

	//Main physics loop
	this.simulate = function (dt) {
		//Garbage collection - remove dead players and items
		for (var id in this.playersToRemove) { delete this.players[this.playersToRemove[id]]; }
		this.playersToRemove = [];

		for (var id in this.itemsToRemove) { delete this.items[this.itemsToRemove[id]]; }
		this.itemsToRemove = [];


		//Simulate players
		for (var id in this.players) {
			var player = this.players[id];

			//motion
			var moveV = player.controlSignal.down - player.controlSignal.up;
			var moveH = player.controlSignal.right - player.controlSignal.left;

			player.moveWithBounds(moveH * dt, moveV * dt, 0, 0, this.width, this.height);

			var item = this._getItemInRange(player);

			if (item != -1 && player.controlSignal.action) {
				player.increaseActionBar(dt);

				//check if complete
				if (player.actionBar == 1) {
					this.deleteItem(item);
					player._lastItem = -1;
					var type = this.items[item].type;

					player.increaseInventory(type);
				}

			} else if (id != -1) {
				player.actionBar *= 0.6;
				player._actionBarChanged = true;
			} else {
				player.actionBar *= 0.3;
				player._actionBarChanged = true;
			}
		}

		//add time and see if round is over
		this.timeElapsed += dt;

		if (this.timeElapsed >= this.roundDuration) {
			//sell player inventories

			for (var id in this.players) {
				var player = this.players[id];
				var profit = this.scenario.calculateProfit(player);

				player.points += profit;
				player.inventory = [0,0,0,0];

				player._secretChanged = true;
			}

			this.initRound();
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

		var roundProgress = Math.floor((this.timeElapsed / this.roundDuration) * 100);

		dString += String.fromCharCode(pDeltaCount);
		dString += String.fromCharCode(iDeltaCount);
		dString += pDeltaString;
		dString += iDeltaString;
		dString += String.fromCharCode(roundProgress);

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
	this.markForDeletion = function () { this._consumed = true; }

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

	this.pos = pos; //[x, y]
	this.nick = nick; //not necessarily mutually exclusive
	this.id = id; //mutually exclusive (an integer from 0 to max_players - 1)
	this.actionBar = 0; //the percentage complete of the action bar: 0(empty) to 1(full)

	//id of the last item in range (for quicker searching)
	this._lastItem = -1;

	this.technology = 0; //technology level
	this.workers = 0; //number of workers
	this.points = 100; //initial points
	this.inventory = [0,0,0,0];
	this._firstRound = true;

	this._confirmedInvestments = false;

	this.controlSignal = {
		up: false,
		left: false,
		right: false,
		down: false,
		action: false
	};

	this._speed = 1;

	//DELTA
	this._posXChanged = false;
	this._posYChanged = false;
	this._actionBarChanged = false
	this._animate = false;
	this._playerKilled = false; //or disconnected
	this._new = true; //starts true

	//Animations (TODO: implement these):
	this._animateResourceComplete = false;

	this.markForDeletion = function () {this._playerKilled = true;}

	//SECRET
	this._secretChanged = false;
	this._newSecret = true;


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

	this.increaseActionBar = function (dt) {
		var time = _timeToComplete(this.technology);

		var da = dt/time;

		var newActionBar = Math.min(this.actionBar + da, 1);
		if (this.actionBar != newActionBar){
			this.actionBar = newActionBar;
			this._actionBarChanged = true;
		}
	}

	this.increaseInventory = function (type) {
		var farmed = _inventoryFarmed(this.workers);
		this.inventory[type] += farmed;
		this._secretChanged = true;
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

	this.encodeInitial = function () {
		var d = [];

		d.push(id);
		d.push(this.nick.length);
		d.push(...this.nick.split('').map(x => x.charCodeAt(0)));
		d.push(..._encodePos(this.pos[0]));
		d.push(..._encodePos(this.pos[1]));

		return d.map(x => String.fromCharCode(x)).join('');
	}

	this.hasDelta = function () {
		return (
			   this._posXChanged
			|| this._posYChanged
			|| this._actionBarChanged
			|| this._animate
			|| this._playerKilled
			|| this._new
		)
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

	this.hasSecret = function () {
		return this._secretChanged || this._newSecret;
	}

	//Data to be sent to only this player
	this.encodeSecret = function () {
		var d = [];

		d.push(2); //header

		//points - 4 bytes
		for (var i = 0; i < 4; ++i) {
			var p = (this.points >> ((3-i) * 8)) & 0xFF;
			d.push(p);
		}

		//inventory
		for (var i = 0; i < 4; ++i) {
			var inv = this.inventory[i];
			var inv1 = (inv >> 8) & 0xFF;
			var inv2 = inv & 0xFF;
			d.push(inv1, inv2);
		}

		d.push(this.technology);

		d.push(this.workers);

		this._secretChanged = false;
		this._newSecret = false;

		return d.map(x => String.fromCharCode(x)).join('');
	}
}

module.exports = {
	World: World,
	Item: Item,
	Player: Player
}
