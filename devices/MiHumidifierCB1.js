const MiHumidifierCA1 = require('./MiHumidifierCA1');

module.exports = class extends MiHumidifierCA1 {
    
    constructor(characteristic) {
        super(characteristic);
        this.version = "cb1";
    }

    initializeTemperature() {
        super.initializeTemperature();
        this.temperatureGetName = "temperature";
        this.convertTemperature = function (temperature) {
            return temperature;
        };
    }

}