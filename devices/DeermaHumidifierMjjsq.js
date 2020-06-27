const { MODES } = require('./constants');

module.exports = class {
    constructor(characteristic) {
        this.version = "deerma";

        this.characteristic = characteristic;

        this.initializePower();
        this.initializeHumidity();
        this.initializeTargetHumidity();
        this.initializeWaterLevel();
        this.initializeMode();
        this.initializeTemperature();
        this.initializeSwitch1();
        this.initializeMute();
    }

    initializePower() {
        this.powerGetName = "OnOff_State";
        this.convertPowerToActivity = function (power) {
            return power === 1 ? this.characteristic.Active.ACTIVE : this.characteristic.Active.INACTIVE;
        };
        this.convertPowerToHumidifierState = function (power) {
            return power === 1 ? this.characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING : this.characteristic.CurrentHumidifierDehumidifierState.INACTIVE;
        };
        this.powerSetName = "Set_OnOff";
        this.convertActivityToPower = function (activity) {
            return activity === this.characteristic.Active.ACTIVE ? 1 : 0;
        };
    }

    initializeHumidity() {
        this.humidityGetName = "Humidity_Value";
    }

    initializeTargetHumidity() {
        this.targetHumidityGetName = "HumiSet_Value";
        this.targetHumiditySetName = "Set_HumiValue";
        this.targetHumidityLimits = {};
        this.targetHumidityLimits.Min = 30;
        this.targetHumidityLimits.Max = 80;
    }

    initializeWaterLevel() {
        this.waterLevelGetName = "waterstatus";
        this.waterLevelLimits = {};
        this.waterLevelLimits.Min = 0;
        this.waterLevelLimits.Max = 1;
        this.convertWaterLevel = function (level) {
            return level;
        };
    }

    initializeMode() {
        this.modeGetName = "Humidifier_Gear";
        this.modeLimits = {};
        this.modeLimits.Max = 3;
        this.convertModeToSpeed = function (mode) {
            return MODES.findIndex(item => item === mode);
        };
        this.modeSetName = "Set_HumidifierGears";
        this.convertSpeedToMode = function (speed) {
            return MODES[speed];
        };
    }

    initializeTemperature() {
        this.temperatureGetName = "TemperatureValue";
        this.convertTemperature = function (temperature) {
            return temperature;
        };
    }

    initializeSwitch1() {
        this.switch1GetName = "Led_State";
        this.convertSwitch1ToSwingMode = function (switch1) {
            return switch1 === 1 ? this.characteristic.SwingMode.SWING_ENABLED : this.characteristic.SwingMode.SWING_DISABLED;
        };
        this.switch1SetName = "SetLedState";
        this.convertSwingModeToSwitch1 = function (swingMode) {
            return swingMode === this.characteristic.SwingMode.SWING_ENABLED ? 1 : 0;
        };
    }

    initializeMute() {
        this.buzzerGetName = "TipSound_State";
        this.convertBuzzerToMute = function (buzzer) {
            return buzzer !== 1;
        };
        this.buzzerSetName = "SetTipSound_Status";
        this.convertMuteToBuzzer = function (mute) {
            return mute ? 0 : 1;
        };
    }
}