const { MODES } = require('constants');

module.exports = class {
    constructor() {
        this.version = "v1";

        this.initializePower();
        this.initializeHumidity();
        this.initializeTargetHumidity();
        this.initializeMode();
        this.initializeTemperature();
    }

    initializePower() {
        this.powerGetName = "power";
        this.convertPowerToActivity = function (power) {
            return power === "on" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
        };
        this.convertPowerToHumidifierState = function (power) {
            return power === "on" ? Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING : Characteristic.CurrentHumidifierDehumidifierState.INACTIVE;
        };
        this.powerSetName = "set_power";
        this.convertActivityToPower = function (activity) {
            return activity === Characteristic.Active.ACTIVE ? "on" : "off";
        };
    }

    initializeHumidity() {
        this.humidityGetName = "humidity";
    }

    initializeTargetHumidity() {
        this.targetHumidityGetName = "limit_hum";
        this.targetHumiditySetName = "set_limit_hum";
        this.targetHumidityLimits = {};
        this.targetHumidityLimits.Min = 30;
        this.targetHumidityLimits.Max = 80;
    }

    initializeMode() {
        this.modeGetName = "mode";
        this.modeLimits = {};
        this.modeLimits.Max = 3;
        this.convertModeToSpeed = function (mode) {
            return MODES.findIndex(item => item === mode);
        };
        this.modeSetName = "set_mode";
        this.convertSpeedToMode = function (speed) {
            return MODES[speed];
        };
    }

    initializeTemperature() {
        this.temperatureGetName = "temp_dec";
        this.convertTemperature = function (temperature) {
            return temperature / 10;
        };
    }
}