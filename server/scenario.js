
/*
 * A class that represents a game scenario
 */
var Scenario = function () {

	//Current of events
	this.events = [];
	this.baseTitles = [
		'[RED] and [YELLOW] are <u>substitute goods</u>',
		'[GREEN] and [PURPLE] are complimentary goods'
	]

	//Market prices for each resource
	this.marketPrices = [10,10,10,10];

	//Labor - workers
	this.laborTraining = 10;
	this.laborWages = 50;

	//Capital - technology(speed)
	this.capitalUpfront = 20;
	this.capitalMaintenance = 50;

	this.baseCost = 100;

	//Game constants
	this.numItems = 1000;

	this.calculateRevenue = function (player) {
		var r = 0;

		for (var i = 0; i < 4; ++i) {
			r += player.inventory[i] * this.marketPrices[i];
		}

		return r;
	}

	this.calculateCosts = function (player) {
		var c = 0;

		if (player._firstRound) {
			player._firstRound = false;
		} else {
			c += player.workers * this.laborWages;
			c += player.technology * this.capitalMaintenance;
			c += this.baseCost;
		}

		return c;
	}

	this.calculateProfit = function (player) {
		var rev = this.calculateRevenue(player);
		var costs = this.calculateCosts(player);
		
		return rev - costs;
	}
}

module.exports = Scenario;
