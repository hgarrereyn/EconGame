var Action = function (type, data) {
	this.type = type;
	this.data = data;
}

//Added by the server when a player connects
var PlayerConnectAction = function (nick, id) {
	return new Action('PlayerConnectAction', {
		nick: nick,
		id: id
	});
}

//Added by the server when a player disconnects
var PlayerDisconnectAction = function (nick, id) {
	return new Action('PlayerDisconnectAction', {
		nick: nick,
		id: id
	});
}


//var MotionAction = function (direction)
