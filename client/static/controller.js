//File to abstract control signals
//
//Eg, keyboard on computer, touch on mobile etc...


var Controller = function () {

	//Keys to send to server (motion and action controls)
	var keybinding = {
		'KeyW': 'up',
		'KeyA': 'left',
		'KeyD': 'right',
		'KeyS': 'down',
		'Space': 'action'
	};

	var keysDown = {
		'up': false,
		'left': false,
		'right': false,
		'down': false,
		'action': false
	};

	var controllerQueue = [];

	function _isControllerKey (code) {
		return (code in keybinding);
	}

	this.init = function () {
		window.onkeydown = function (e) {
			if (_isControllerKey(e.code)) {
				if (keysDown[keybinding[e.code]] == false){
					keysDown[keybinding[e.code]] = true;
				}
			}
		}

		window.onkeyup = function (e) {
			if (_isControllerKey(e.code)) {
				if (keysDown[keybinding[e.code]] == true){
					keysDown[keybinding[e.code]] = false;
				}
			}
		}
	}

	//8 - bit number:
	//0: up
	//1: left
	//2: right
	//3: down
	//4: action
	function encodeKeysDown (keysDown) {
		var enc = 0;

		enc += keysDown['up'] << 0;
		enc += keysDown['left'] << 1;
		enc += keysDown['right'] << 2;
		enc += keysDown['down'] << 3;
		enc += keysDown['action'] << 4;

		return String.fromCharCode(enc);
	}

	//Returns a condensed packet with key controls
	this.sample = function () {
		return encodeKeysDown(this.keysDown);
	}


}
