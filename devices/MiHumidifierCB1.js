const MiHumidifierCA1 = require('./MiHumidifierCA1');

module.exports = class extends MiHumidifierCA1 {
    constructor(characteristic) {
        super(characteristic);
        this.version = "cb1";

        this.initializeMute();
    }

    initializeTemperature() {
        super.initializeTemperature();
        this.temperatureGetName = "temperature";
        this.convertTemperature = function (temperature) {
            return temperature;
        };
    }

    // TODO: find out if it is supported on other devices as well; only tested on CB1 yet
    initializeMute() {
        this.buzzerGetName = "buzzer";
        this.convertBuzzerToMute = function (buzzer) {
            return buzzer !== 'on';
        };
        this.buzzerSetName = "set_buzzer";
        this.convertMuteToBuzzer = function (mute) {
            return mute ? 'off' : 'on';
        };
    }

}