const MiHumidifierV1 = require('./MiHumidifierV1');

module.exports = class extends MiHumidifierV1 {
    constructor() {
        super();
        this.version = "cal";

        this.initializeWaterLevel();
        this.initializeChildLock();
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

    initializeChildLock() {
        this.childLockGetName = "child_lock";
        this.convertLockedToChildLock = function (locked) {
            return locked === 'on' ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED;
        };
        this.childLockSetName = "set_child_lock";
        this.convertChildLockToLocked = function (childLock) {
            return childLock === Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED ? 'on' : 'off';
        };
    }

    initializeSwitch1() {
        this.switch1GetName = "dry";
        this.convertSwitch1ToSwingMode = function (switch1) {
            return switch1 === 'on' ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED;
        };
        this.switch1SetName = "set_dry";
        this.convertSwingModeToSwitch1 = function (swingMode) {
            return swingMode === Characteristic.SwingMode.SWING_ENABLED ? 'on' : 'off';
        };
    }
}