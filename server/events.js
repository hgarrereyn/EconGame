var Event = function (title, apply) {
	this.title = title;
	this.apply = apply; // (scenario) -> void
}

var SupplyShift = function (title, res, mag, positive) {
	return new Event(title, function (scenario) {

		if (positive) {
			scenario.marketPrices[res] /= mag;



		} else {

		}

	});
}

//supply increase
//
//supply decrease
//demand increase
//demand decrease
//price floor
//price ceiling
//unit tax


var increaseSupply = new Event([

], function (scenario, resource, magnitude) {

});
