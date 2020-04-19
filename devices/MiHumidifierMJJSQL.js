// deerma.humidifier.mjjsq contract: https://github.com/rytilahti/python-miio/issues/533, https://github.com/rytilahti/python-miio/blob/master/miio/airhumidifier_mjjsq.py
const MiHumidifierCBL = require('./MiHumidifierCBL');

module.exports = class extends MiHumidifierCBL {
    constructor() {
        super();
        this.version = "mjjsql";
    }

    initializePower() {
        super.initializePower();
        this.powerGetName = "OnOff_State";
        this.convertPowerToActivity = function (power) {
            return power === 1 ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
        };
        this.convertPowerToHumidifierState = function (power) {
            return power === 1 ? Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING : Characteristic.CurrentHumidifierDehumidifierState.INACTIVE;
        };
        this.powerSetName = "Set_OnOff";
        this.convertActivityToPower = function (activity) {
            return activity === Characteristic.Active.ACTIVE ? 1 : 0;
        };
    }

    initializeHumidity() {
        super.initializeHumidity();
        this.humidityGetName = "Humidity_Value";
    }

    initializeTargetHumidity() {
        super.initializeTargetHumidity();
        this.targetHumidityGetName = "HumiSet_Value";
        this.targetHumiditySetName = "Set_HumiValue";
        this.targetHumidityLimits.Min = 40;
        this.targetHumidityLimits.Max = 70;
    }

    initializeWaterLevel() {
        super.initializeWaterLevel();
        this.waterLevelGetName = "waterstatus";
        this.waterLevelLimits.Min = 0;
        this.waterLevelLimits.Max = 1;
        this.convertWaterLevel = function (level) {
            return level;
        };
    }

    initializeMode() {
        super.initializeMode();
        this.modeGetName = "Humidifier_Gear";
        this.convertModeToSpeed = function (mode) {
            return mode;
        };
        this.modeSetName = "Set_HumidifierGears";
        this.convertSpeedToMode = function (speed) {
            return speed;
        };
    }

    initializeTemperature() {
        super.initializeTemperature();
        this.temperatureGetName = "TemperatureValue";
    }

    initializeSwitch1() {
        super.initializeSwitch1();
        this.switch1GetName = "Led_State";
        this.convertSwitch1ToSwingMode = function (switch1) {
            return switch1 === 1 ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED;
        };
        this.switch1SetName = "SetLedState";
        this.convertSwingModeToSwitch1 = function (swingMode) {
            return Number(swingMode === Characteristic.SwingMode.SWING_ENABLED);
        };
    }

    initializeChildLock() {
    }
}