const MiHumidifierV1 = require('./MiHumidifierV1');

module.exports = class extends MiHumidifierV1 {
    constructor(characteristic) {
        super(characteristic);
        this.version = "ca1";

        this.initializeWaterLevel();
        this.initializeSwitch1();
    }

    initializeMode() {
        super.initializeMode();
        this.modeLimits.Max = 4;
    }

    initializeWaterLevel() {
        this.waterLevelGetName = "depth";
        this.waterLevelLimits = {};
        this.waterLevelLimits.Min = 0;
        this.waterLevelLimits.Max = 100;
        this.convertWaterLevel = function (level) {
            return level / 1.2;
        };
    }

    initializeSwitch1() {
        this.switch1GetName = "dry";
        this.convertSwitch1ToSwingMode = function (switch1) {
            return switch1 === 'on' ? this.characteristic.SwingMode.SWING_ENABLED : this.characteristic.SwingMode.SWING_DISABLED;
        };
        this.switch1SetName = "set_dry";
        this.convertSwingModeToSwitch1 = function (swingMode) {
            return swingMode === this.characteristic.SwingMode.SWING_ENABLED ? 'on' : 'off';
        };
    }
}
