var Game = function () {

	var that = this;

	this.controller = new Controller();
	this.timer = new Timer();
	this.worldView = new WorldView();

	this.two = undefined;

	this._zoom = 40;

	this.components = {
		playerGraphics: {},
		itemGraphics: {}
	};

	this.tracking = {
		currentCamera: [0,0],
		targetCamera: [0,0]
	};

	this.init = function () {
		that.controller.init();

		CONN_STATE.messageHandler.registerTrigger('INITIAL', function (ws, data) {
			that.worldView.loadInitial(data);
		});

		CONN_STATE.messageHandler.registerTrigger('DELTA', function (ws, data) {
			that.worldView.loadDelta(data);

			if (that.worldView.canSendControl) {
				ws.send(that.controller.sample());
			}
		});

		CONN_STATE.messageHandler.registerTrigger('SECRET', function (ws, data) {
			that.worldView.loadSecret(data);
		});

		CONN_STATE.messageHandler.registerTrigger('ROUND_START', function (ws, data) {

		});

		CONN_STATE.messageHandler.registerTrigger('ROUND_END', function (ws, data) {

		});
	}

	this.initGraphics = function () {
		var game_screen = document.getElementById('game_screen');
		this.two = new Two({fullscreen: true}).appendTo(game_screen);

		var t = this.two;

		this.components.border = t.makeRectangle(50,50,100,100); //Wall border
		this.components.border.fill = '#343838';
		this.components.border.linewidth = 0;

		//Draw the grid
		var grid = new Two.Group();
		var miniGrid = new Two.Group();

		for (var x = 0; x <= 100; ++x) {
			var line = new Two.Line(x, 0, x, 100);

			if (x % 10 == 0) {
				grid.add(line);
			} else {
				miniGrid.add(line);
			}
		}

		for (var y = 0; y <= 100; ++y) {
			var line = new Two.Line(0, y, 100, y);

			if (y % 10 == 0) {
				grid.add(line);
			} else {
				miniGrid.add(line);
			}
		}

		grid.linewidth = 0.05;
		grid.opacity = 0.5;
		miniGrid.linewidth = 0.01;
		miniGrid.opacity = 0.25;

		this.components.grid = grid;
		this.components.miniGrid = miniGrid;

		//Set up SVG layers (there is no z-index, layering is determined by DOM order)
		this.components.itemLayer = new Two.Group();
		this.components.playerLayer = new Two.Group();
		this.components.clientPlayerLayer = new Two.Group();

		this.components.mainFrame = t.makeGroup(
			this.components.border,
			this.components.grid,
			this.components.miniGrid,
			this.components.itemLayer,
			this.components.playerLayer,
			this.components.clientPlayerLayer
		);

		$('#track-nick').text(CONN_STATE.nick);
		$('#track-id').text(CONN_STATE.id);

		t.bind('update', this.update);

		t.play();
	}


	this.update = function (frame, dt) {
		//constants
		var _zoom = that._zoom;
		var _cameraStiffness = 0.5;

		//helper variables
		var t = that.two;
		var c = that.components;
		var thisPlayer = that.worldView.players[CONN_STATE.id];

		//window framing
		var width = t.width;
		var height = t.height;
		var constr_dim = Math.min(width, height);
		var scale = (constr_dim / 100) * _zoom;

		//camera tracking
		c.mainFrame.scale = scale;

		//set coordinate numbers
		$('#track-posX').text(thisPlayer.pos[0].toFixed(2));
		$('#track-posY').text(thisPlayer.pos[1].toFixed(2));

		$('#time_bar').css({
			width: that.worldView.roundProgress + '%'
		});

		//camera "interpolation" - really just averaging the current pos and target pos
		that.tracking.targetCamera = thisPlayer.pos;
		that.tracking.currentCamera[0] = (that.tracking.targetCamera[0] * _cameraStiffness) + (that.tracking.currentCamera[0] * (1 - _cameraStiffness));
		that.tracking.currentCamera[1] = (that.tracking.targetCamera[1] * _cameraStiffness) + (that.tracking.currentCamera[1] * (1 - _cameraStiffness));
		c.mainFrame.translation.set(-that.tracking.currentCamera[0] * scale + (width / 2), -that.tracking.currentCamera[1] * scale + (height / 2));

		//track inventory & points
		$('#track-inv0').text(thisPlayer.inventory[0]);
		$('#track-inv1').text(thisPlayer.inventory[1]);
		$('#track-inv2').text(thisPlayer.inventory[2]);
		$('#track-inv3').text(thisPlayer.inventory[3]);

		$('#track-points').text(thisPlayer.points);
		$('#track-technology').text(thisPlayer.technology);
		$('#track-workers').text(thisPlayer.workers);

		//Add new players to the scene
		for (var index in that.worldView.addPlayers) {
			//get the player id
			var player_id = that.worldView.addPlayers[index];

			//create the graphics object
			var playerGraphic = drawPlayer(t, that.worldView.players[player_id]);

			//store it
			that.components.playerGraphics[player_id] = playerGraphic;

			//add it to the frame
			if (player_id == CONN_STATE.id)
				that.components.clientPlayerLayer.add(playerGraphic);
			else
				that.components.playerLayer.add(playerGraphic);
		}
		that.worldView.addPlayers = []; // clear the array, we've already added the players

		//Add new items to the scene
		for (var index in that.worldView.addItems) {
			//get the item id
			var item_id = that.worldView.addItems[index];

			//create the graphics object
			var itemGraphic = drawItem(t, that.worldView.items[item_id]);

			//store it
			that.components.itemGraphics[item_id] = itemGraphic;

			//add it to the main frame
			that.components.itemLayer.add(itemGraphic);
		}
		that.worldView.addItems = [];

		//Update player graphics
		for (var id in that.worldView.players) {
			var player = that.worldView.players[id];

			updatePlayer(t, c.playerGraphics[id], player, scale / _zoom);

			//check if player was killed
			if (player.killed) {
				//remove it from the frame
				c.playerGraphics[id].parent.remove(c.playerGraphics[id]);

				//stop tracking it
				delete c.playerGraphics[id];

				//tell the worldview that it's ok to stop tracking the playerview
				that.worldView.destroyPlayer(id);
			}
		}

		for (var id in that.worldView.items) {
			var item = that.worldView.items[id];

			updateItem(c.itemGraphics[id], item, thisPlayer, scale / _zoom);

			if (item.consumed) {
				c.itemGraphics[id].parent.remove(c.itemGraphics[id]);
				delete c.playerGraphics[id];
				that.worldView.destroyItem(id);
			}
		}

	}

	function drawPlayer (two, playerView) {
		var x = playerView.pos[0];
		var y = playerView.pos[1];

		var g = new Two.Group();
		g._store = {};

		var player = two.makeCircle(0,0,0.1);
		player.linewidth = 0.05;
		player.fill = '#FFFFFF';

		var actionBar = two.makeArcSegment(0,0,0.14,0.18,-Math.PI,Math.PI);
		actionBar.stroke = 'rgba(0,0,0,0)';

		var actionBarGroup = two.makeGroup(actionBar);

		var actionBarMask = two.makePath(0,0,  0,0,  0,0,  0,0,  0,0);
		_verticesForMask(0, actionBarMask);
		actionBarMask.stroke = 'rgba(0,0,0,0)';
		actionBarMask.fill = '#fff';
		actionBarMask.opacity = 0.3;

		actionBarGroup.mask = actionBarMask;

		//indicate the client's player
		if (playerView.id == CONN_STATE.id) {
			player.stroke = 'rgba(0, 223, 252, 0.8)';
			actionBar.fill = 'rgba(0, 223, 252, 0.8)';
		} else {
			player.stroke = 'rgba(199, 217, 226, 0.8)';
			actionBar.fill = 'rgba(199, 217, 226, 0.8)';
		}

		g._store.player = player;
		g._store.actionBarMask = actionBarMask;

		var text = new Two.Text(playerView.nick, 0, 0);
		text.fill = '#fff';
		g._store.text = text;

		g.add(player, text, actionBarGroup);
		g.translation.set(x,y);

		return g;
	}

	/*
	 * Configure the 5 point actionBar mask
	 */
	function _verticesForMask (percent, mask) {
		var _r = 0.4;

		var vertices = [
			[0,0],
			[0,-_r]
		];

		for (var i = 1; i < 4; ++i) {
			var angle = - (((percent / 3) * i) * Math.PI * 2);
			angle += (Math.PI / 2);

			var x = Math.cos(angle) * _r;
			var y = -Math.sin(angle) * _r;

			vertices.push([x,y]);
		}

		for (var i in vertices) {
			var v = vertices[i];

			mask.vertices[i].set(...v);
		}
	}

	function drawItem (t, itemView) {
		var x = itemView.pos[0];
		var y = itemView.pos[1];

		var type = itemView.type;

		var g = new Two.Group();
		g._store = {};

		//Types:
		//
		// 0: red triangle
		// 1: yellow square
		// 2: green circle
		// 3: purple cross

		var item = undefined;

		if (type == 0) {

			item = new Two.Polygon(0,0,1,3);
			item.fill = '#C2412D';

		} else if (type == 1) {

			item = new Two.Polygon(0,0,1,4);
			item.fill = '#D1AA34';

		} else if (type == 2) {

			item = t.makeCircle(0,0,1);
			item.fill = '#81A844';

		} else {

			var c1 = t.makeRectangle(0,0,2/3,2);
			var c2 = t.makeRectangle(0,0,2,2/3);
			item = t.makeGroup(c1,c2);

			item.fill = '#A46583';

		}

		item.opacity = 0.7;
		item.linewidth = 0.2;
		item.stroke = '#fff';
		item.scale = 0.08;

		var border = t.makeCircle(0,0,0.5);
		border.linewidth = 0.2 * 0.08;
		border.fill = 'rgba(0,0,0,0)';
		border.stroke = '#fff';
		border.opacity = 0; // to 0.7

		g._store.border = border;

		g.add(item, border);

		g.translation.set(x,y);

		return g;
	}

	function updatePlayer (two, playerGraphic, playerView, scale) {
		//Player motion interpolation
		playerView.trackingPos[0] = (playerView.trackingPos[0] * 0.5) + (playerView.pos[0] * 0.5);
		playerView.trackingPos[1] = (playerView.trackingPos[1] * 0.5) + (playerView.pos[1] * 0.5);
		playerGraphic.translation.set(playerView.trackingPos[0], playerView.trackingPos[1]);

		playerGraphic._store.text.translation.set(0, 0.24)
		playerGraphic._store.text.scale = 0.025 / scale;

		playerView.trackingActionBar = (playerView.trackingActionBar + playerView.actionBar) / 2;
		if (playerView.actionBar == 0) playerView.trackingActionBar = 0; //don't loop around once it is finished
		var actionBarMask = playerGraphic._store.actionBarMask;
		_verticesForMask(playerView.trackingActionBar, actionBarMask);
	}

	function updateItem (itemGraphic, itemView, thisPlayer, scale) {
		//check if player is within 0.5 units
		var dx = thisPlayer.pos[0] - itemView.pos[0];
		var dy = thisPlayer.pos[1] - itemView.pos[1];

		var dist2 = (dx * dx) + (dy * dy);

		var within = (0.5 * 0.5) >= dist2;

		if (within) {
			itemGraphic._store.border.opacity = 0.7;
		} else {
			itemGraphic._store.border.opacity = 0;
		}
	}

}
