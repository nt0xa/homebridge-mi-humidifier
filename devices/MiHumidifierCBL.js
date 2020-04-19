const MiHumidifierCAL = require('./MiHumidifierCAL');

module.exports = class extends MiHumidifierCAL {
    constructor() {
        super();
        this.version = "cbl";
    }

    initializeTemperature() {
        super.initializeTemperature();
        this.temperatureGetName = "temperature";
        this.convertTemperature = function (temperature) {
            return temperature;
        };
    }
}