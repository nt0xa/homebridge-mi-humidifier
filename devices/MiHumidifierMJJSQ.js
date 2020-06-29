// deerma.humidifier.mjjsq contract: https://github.com/rytilahti/python-miio/issues/533, https://github.com/rytilahti/python-miio/blob/master/miio/airhumidifier_mjjsq.py
const MiHumidifierCB1 = require('./MiHumidifierCB1');

module.exports = class extends MiHumidifierCB1 {
    constructor(characteristic) {
        super(characteristic);
        this.version = "mjjsq";
    }

    initializePower() {
        super.initializePower();
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
        super.initializeHumidity();
        this.humidityGetName = "Humidity_Value";
    }

    initializeTargetHumidity() {
        super.initializeTargetHumidity();
        this.targetHumidityGetName = "HumiSet_Value";
        this.targetHumiditySetName = "Set_HumiValue";
        this.targetHumidityLimits.Min = 30;
        this.targetHumidityLimits.Max = 80;
    }

    initializeWaterLevel() {
        super.initializeWaterLevel();
        this.waterLevelGetName = "waterstatus";
        this.waterLevelLimits.Min = 0;
        this.waterLevelLimits.Max = 100;
        this.convertWaterLevel = function (level) {
            return level * 100;
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
            return switch1 === 1 ? this.characteristic.SwingMode.SWING_ENABLED : this.characteristic.SwingMode.SWING_DISABLED;
        };
        this.switch1SetName = "SetLedState";
        this.convertSwingModeToSwitch1 = function (swingMode) {
            return Number(swingMode === this.characteristic.SwingMode.SWING_ENABLED);
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

    initializeChildLock() {
    }
}