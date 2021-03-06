var Game = function () {

	//For reference in callbacks
	var that = this;

	//Initialize other classes
	this.controller = new Controller();
	this.timer = new Timer();
	this.worldView = new WorldView();

	this.two = undefined;

	this.lastPlayer = undefined;

	this._zoom = 40;

	this.components = {
		playerGraphics: {},
		itemGraphics: {}
	};

	this.tracking = {
		currentCamera: [0,0],
		targetCamera: [0,0]
	};

	//Labels for DOM elements
	this.labels = {
		posX: '',
		posY: '',
		points: '',
		inv0: '',
		inv1: '',
		inv2: '',
		inv3: '',
		technology: '',
		workers: '',

		playerCount: '',
		fps: ''
	};

	this._dt_history = [0,0,0,0,0,0,0,0,0,0]; //Average over ten samples
	this._fps = 0;

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

		CONN_STATE.messageHandler.registerTrigger('ROUND', function (ws, data) {
			that.worldView.loadRound(data);
		});
	}

	this.initGraphics = function () {
		var graphics_panel = document.getElementById('graphics_panel');
		this.two = new Two({fullscreen: true}).appendTo(graphics_panel);

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

	this.updateLabels = function (thisPlayer) {
		var labels = this.labels;

		function writeIfChanged (value, elem, ref) {
			if (labels[elem] !== value) {
				labels[elem] = value;
				$(ref).text(value);
			}
		}

		writeIfChanged(thisPlayer.pos[0].toFixed(2), 'posX', '#track-posX');
		writeIfChanged(thisPlayer.pos[1].toFixed(2), 'posY', '#track-posY');

		writeIfChanged(thisPlayer.inventory[0], 'inv0', '#track-inv0');
		writeIfChanged(thisPlayer.inventory[1], 'inv1', '#track-inv1');
		writeIfChanged(thisPlayer.inventory[2], 'inv2', '#track-inv2');
		writeIfChanged(thisPlayer.inventory[3], 'inv3', '#track-inv3');

		writeIfChanged(thisPlayer.points, 'points', '#track-points');
		writeIfChanged(thisPlayer.technology, 'technology', '#track-technology');
		writeIfChanged(thisPlayer.workers, 'workers', '#track-workers');

		writeIfChanged(this.worldView.playerCount, 'playerCount', '#track-playerCount');
		writeIfChanged(this._fps, 'fps', '#track-fps');

		/*
		$('#time_bar').css({
			width: that.worldView.roundProgress + '%'
		});
		*/
	}

	this.update = function (frame, dt) {
		//console.time('update');

		if (that._dt_history.length < 10) {
			that._dt_history.push(dt);
		} else {
			that._fps = Math.floor(1000 / (that._dt_history.reduce((a,b) => a+b) / 10));
			that._dt_history = [];
		}

		//constants
		var _zoom = that._zoom;
		var _cameraStiffness = 0.5;

		//helper variables
		var t = that.two;
		var c = that.components;
		var thisPlayer = that.worldView.players[CONN_STATE.id];

		if (thisPlayer == undefined) {
			console.log('Game :: Waiting for information packets');
			return;
		}

		//window framing
		var width = t.width;
		var height = t.height;
		var constr_dim = Math.min(width, height);
		var scale = (constr_dim / 100) * _zoom;

		//camera tracking
		if (c.mainFrame.scale != scale) //TEMP: performance
			c.mainFrame.scale = scale;

		//camera "interpolation" - really just averaging the current pos and target pos
		that.tracking.targetCamera = thisPlayer.pos;
		that.tracking.currentCamera[0] = (that.tracking.targetCamera[0] * _cameraStiffness) + (that.tracking.currentCamera[0] * (1 - _cameraStiffness));
		that.tracking.currentCamera[1] = (that.tracking.targetCamera[1] * _cameraStiffness) + (that.tracking.currentCamera[1] * (1 - _cameraStiffness));

		c.mainFrame.translation.set(-that.tracking.currentCamera[0] * scale + (width / 2), -that.tracking.currentCamera[1] * scale + (height / 2));

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

		that.updateLabels(thisPlayer);

		//See if the round ended, open up the window
		if (that.worldView.shouldShowMarket) {
			that.showMarket(that.worldView, thisPlayer);
			that.worldView.shouldShowMarket = false;
		}

		//console.timeEnd('update');
	}

	this.showMarket = function (worldView, thisPlayer) {
		$('#market-inv0').text(thisPlayer.inventory[0]);
		$('#market-inv1').text(thisPlayer.inventory[1]);
		$('#market-inv2').text(thisPlayer.inventory[2]);
		$('#market-inv3').text(thisPlayer.inventory[3]);

		$('#market-price0').text('$' + worldView.price0);
		$('#market-price1').text('$' + worldView.price1);
		$('#market-price2').text('$' + worldView.price2);
		$('#market-price3').text('$' + worldView.price3);

		var rev0 = thisPlayer.inventory[0] * worldView.price0;
		var rev1 = thisPlayer.inventory[1] * worldView.price1;
		var rev2 = thisPlayer.inventory[2] * worldView.price2;
		var rev3 = thisPlayer.inventory[3] * worldView.price3;

		$('#market-rev0').text('$' + rev0);
		if (rev0 == 0) { $('#market-res0').addClass('empty'); }
		else { $('#market-res0').removeClass('empty'); }

		$('#market-rev1').text('$' + rev1);
		if (rev1 == 0) { $('#market-res1').addClass('empty'); }
		else { $('#market-res1').removeClass('empty'); }

		$('#market-rev2').text('$' + rev2);
		if (rev2 == 0) { $('#market-res2').addClass('empty'); }
		else { $('#market-res2').removeClass('empty'); }

		$('#market-rev3').text('$' + rev3);
		if (rev3 == 0) { $('#market-res3').addClass('empty'); }
		else { $('#market-res3').removeClass('empty'); }

		var laborTotal = thisPlayer.workers * worldView.priceLabor;
		var capitalTotal = thisPlayer.technology * worldView.priceCapital;

		$('#market-labor-count').text(thisPlayer.workers);
		$('#market-labor-cost').text('$' + worldView.priceLabor);
		$('#market-labor-total').text('$' + laborTotal);
		if (laborTotal == 0) { $('#market-labor').addClass('empty'); }
		else { $('#market-labor').removeClass('empty'); }

		$('#market-capital-count').text(thisPlayer.technology);
		$('#market-capital-cost').text('$' + worldView.priceCapital);
		$('#market-capital-total').text('$' + capitalTotal);
		if (capitalTotal == 0) { $('#market-capital').addClass('empty'); }
		else { $('#market-capital').removeClass('empty'); }

		var fixed = (thisPlayer.firstRound ? 0 : 1);
		var fixedTotal = (thisPlayer.firstRound ? 0 : worldView.priceFixed);
		thisPlayer.firstRound = false;

		$('#market-fixed-count').text(fixed);
		$('#market-fixed-cost').text('$' + worldView.priceFixed);
		$('#market-fixed-total').text('$' + fixedTotal);
		if (fixedTotal == 0) { $('#market-fixed').addClass('empty'); }
		else { $('#market-fixed').removeClass('empty'); }

		var profit = (rev0 + rev1 + rev2 + rev3) - (laborTotal + capitalTotal + fixedTotal);
		$('#market-profit').text('$' + profit);

		//Dials
		var workers = thisPlayer.workers;
		var technology = thisPlayer.technology;

		var initialWorkers = workers;
		var initialTechnology = technology;

		$('#value-labor').text(workers);
		$('#value-technology').text(technology);

		$('#dial-labor-decrease').click(function () {
			if (workers > 0) workers--;
			$('#value-labor').text(workers);
			updateConfirm();
		});

		$('#dial-labor-increase').click(function () {
			if (workers < 255) workers++;
			$('#value-labor').text(workers);
			updateConfirm();
		});

		$('#dial-capital-decrease').click(function () {
			if (technology > 0) technology--;
			$('#value-capital').text(technology);
			updateConfirm();
		});

		$('#dial-capital-increase').click(function () {
			if (technology < 255) technology++;
			$('#value-capital').text(technology);
			updateConfirm();
		});

		function updateConfirm () {

		}

		var that = this;
		$('#confirm_button').click(function() {
			that.confirm(workers, technology);
		});

		$('#game_cover').addClass('show');
		$('#round_panel').addClass('show');
	}

	this.confirm = function (workers, technology) {
		var ws = CONN_STATE._ws;
		var investmentPacket = that.worldView.investmentPacket(workers, technology);
		ws.send(investmentPacket);

		this.worldView.canSendControl = true;

		$('#game_cover').removeClass('show');
		$('#round_panel').removeClass('show');
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
		text.translation.set(0, 0.24);
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

		if (playerGraphic._store.text.scale != (0.025 / scale)) //TEMP: looking for perfomance improvements
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
			if (itemGraphic._store.border.opacity != 0.7)
				itemGraphic._store.border.opacity = 0.7;
		} else {
			if (itemGraphic._store.border.opacity != 0)
				itemGraphic._store.border.opacity = 0;
		}
	}

}
