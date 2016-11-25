var Game = function () {

	var that = this;

	this.controller = new Controller();
	this.timer = new Timer();
	this.worldView = new WorldView();

	this.two = undefined;

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

			//simulate latency
			//setTimeout(function () {
			ws.send(that.controller.sample());
			//}, (Math.random() * 500) + 50);
		});
	}

	this.initGraphics = function () {
		var game_screen = document.getElementById('game_screen');
		this.two = new Two({fullscreen: true}).appendTo(game_screen);

		var t = this.two;

		this.components.border = t.makeRectangle(50,50,100,100); //Wall border
		this.components.border.fill = '#343838';
		this.components.border.linewidth = 0;

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

		this.components.mainFrame = t.makeGroup(this.components.border, this.components.grid, this.components.miniGrid);

		$('#track-nick').text(CONN_STATE.nick);
		$('#track-id').text(CONN_STATE.id);

		t.bind('update', this.update);

		t.play();
	}


	this.update = function (frame, dt) {
		var _zoom = 50;

		var t = that.two;
		var c = that.components;

		var width = t.width;
		var height = t.height;
		var constr_dim = Math.min(width, height);
		var scale = (constr_dim / 100) * _zoom;

		var thisPlayer = that.worldView.players[CONN_STATE.id];

		$('#track-posX').text(thisPlayer.pos[0].toFixed(2));
		$('#track-posY').text(thisPlayer.pos[1].toFixed(2));

		//Camera tracking
		c.mainFrame.scale = scale;

		var _cameraStiffness = 0.5;
		that.tracking.targetCamera = thisPlayer.pos;
		that.tracking.currentCamera[0] = (that.tracking.targetCamera[0] * _cameraStiffness) + (that.tracking.currentCamera[0] * (1 - _cameraStiffness));
		that.tracking.currentCamera[1] = (that.tracking.targetCamera[1] * _cameraStiffness) + (that.tracking.currentCamera[1] * (1 - _cameraStiffness));
		c.mainFrame.translation.set(-that.tracking.currentCamera[0] * scale + (width / 2), -that.tracking.currentCamera[1] * scale + (height / 2));

		for (var index in that.worldView.addPlayers) {
			var player_id = that.worldView.addPlayers[index];

			console.log('adding new player');
			console.log(that.worldView.players[player_id]);

			var playerGraphic = drawPlayer(t, that.worldView.players[player_id]);
			that.components.playerGraphics[player_id] = playerGraphic;
			that.components.mainFrame.add(playerGraphic);
		}

		for (var id in that.worldView.players) {
			var player = that.worldView.players[id];
			updatePlayer(c.playerGraphics[id], player, scale / _zoom);
			if (player.killed) {
				c.playerGraphics[id].parent.remove(c.playerGraphics[id]);
				delete c.playerGraphics[id];
				that.worldView.destroyPlayer(id);
			}
		}

		that.worldView.addPlayers = [];
	}

	function drawPlayer (two, playerView) {
		var x = playerView.pos[0];
		var y = playerView.pos[1];

		var g = new Two.Group();
		g._store = {};

		var player = two.makeCircle(0,0,0.1);
		player.linewidth = 0.05;
		player.fill = '#FFFFFF';

		//indicate the client's player
		if (playerView.id == CONN_STATE.id) {
			player.stroke = 'rgba(0, 223, 252, 0.8)';
		} else {
			player.stroke = 'rgba(199, 217, 226, 0.8)';
		}

		g._store.player = player;

		var text = new Two.Text(playerView.nick, 0, 0);
		text.fill = '#fff';
		g._store.text = text;

		g.add(player, text);
		g.translation.set(x,y);

		return g;
	}

	function updatePlayer (playerGraphic, playerView, scale) {
		//Player motion interpolation
		playerView.trackingPos[0] = (playerView.trackingPos[0] * 0.5) + (playerView.pos[0] * 0.5);
		playerView.trackingPos[1] = (playerView.trackingPos[1] * 0.5) + (playerView.pos[1] * 0.5);
		playerGraphic.translation.set(playerView.trackingPos[0], playerView.trackingPos[1]);

		playerGraphic._store.text.translation.set(0, 0.18)
		playerGraphic._store.text.scale = 0.025 / scale;
	}

}
