var Timer = function () {

	//Calls fn every 'delay' milliseconds
	this.every = function (delay, fn) {
		var i = 0;

		var meta = function () {
			fn(i++);
			setTimeout(meta, delay);
		}

		meta();
	}

}

module.exports = {
	Timer: Timer
}
