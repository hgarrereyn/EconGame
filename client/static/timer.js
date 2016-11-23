var Timer = function () {

	//Calls fn every 'delay' milliseconds
	this.every = function (delay, fn) {
		var meta = function () {
			fn();
			setTimeout(meta, delay);
		}

		meta();
	}

}
