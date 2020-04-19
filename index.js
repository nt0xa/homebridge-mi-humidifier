// Characteristics: http://auto.caitken.com/posts/2018/09/09/nodered-homekit-characteristics-reference
const MiHumidifierV1 = require('./devices/MiHumidifierV1');
const MiHumidifierCAL = require('./devices/MiHumidifierCAL');
const MiHumidifierCBL = require('./devices/MiHumidifierCBL');
const MiHumidifierMJJSQL = require('./devices/MiHumidifierMJJSQL');
const miio = require('miio')

const defaults = {
    model: 'v1',
    name: 'Humidifier',
    showTemperature: false,
    nameTemperature: 'Temperature',
    showHumidity: false,
    nameHumidity: 'Humidity'
};

const SUPPORTED_HUMIDIFIERS = [new MiHumidifierV1(), new MiHumidifierCAL(), new MiHumidifierCBL(), new MiHumidifierMJJSQL()];

let Service, Characteristic;

module.exports = homebridge => {
    Service = homebridge.hap.Service
    Characteristic = homebridge.hap.Characteristic
    homebridge.registerAccessory('homebridge-mi-humidifier', 'MiHumidifier', MiHumidifier)
}

class MiHumidifier {
    constructor(log, config) {
        if (!config.ip) throw new Error('Your must provide IP address of the Humidifier');
        if (!config.token) throw new Error('Your must provide token of the Humidifier');

        let options = { ...defaults, ...config };
        this.infoService = new Service.AccessoryInformation();
        this.humidifierService = new Service.HumidifierDehumidifier(options.name);

        this.log = log;
        this.ip = config.ip;
        this.token = config.token;
        this.services = [this.humidifierService, this.infoService];
        this.humidifier = SUPPORTED_HUMIDIFIERS.find(element => element.version === config.model);

        // Device info
        this.infoService
            .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
            .setCharacteristic(Characteristic.Model, config.model)
            .setCharacteristic(Characteristic.SerialNumber, 'Undefined');

        // Active
        if (this.humidifier.powerGetName && this.humidifier.powerSetName) {
            this.humidifierService
                .getCharacteristic(Characteristic.Active)
                .on('get', this.getActive.bind(this))
                .on('set', this.setActive.bind(this));
        }

        // Current state
        this.humidifierService
            .getCharacteristic(Characteristic.CurrentHumidifierDehumidifierState)
            .setProps({
                validValues: [0, 2]
            })
            .on('get', this.getCurrentHumidifierState.bind(this));

        // Target state (only humidifier is supported)
        this.humidifierService
            .getCharacteristic(Characteristic.TargetHumidifierDehumidifierState)
            .setProps({
                validValues: [1]
            })
            .setValue(Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER);

        // Current relative humidity
        if (this.humidifier.humidityGetName) {
            this.humidifierService
                .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .on('get', this.getCurrentRelativeHumidity.bind(this));
        }

        // Target relative humidity
        if (this.humidifier.targetHumidityGetName && this.humidifier.targetHumiditySetName) {
            this.humidifierService
                .getCharacteristic(Characteristic.RelativeHumidityHumidifierThreshold)
                .on('get', this.getTargetRelativeHumidity.bind(this))
                .on('set', this.setTargetRelativeHumidity.bind(this));
        }

        // Current water level (remaining water level)
        if (this.humidifier.waterLevelGetName) {
            this.humidifierService
                .getCharacteristic(Characteristic.WaterLevel)
                .setProps({
                    minValue: this.humidifier.waterLevelLimits.Min,
                    maxValue: this.humidifier.waterLevelLimits.Max
                })
                .on('get', this.getWaterLevel.bind(this));
        }

        // Rotation speed
        if (this.humidifier.modeGetName && this.humidifier.modeSetName) {
            this.humidifierService
                .getCharacteristic(Characteristic.RotationSpeed)
                .setProps({
                    minValue: 0,
                    maxValue: this.humidifier.modeLimits.Max,
                    minStep: 1
                })
                .on('get', this.getRotationSpeed.bind(this))
                .on('set', this.setRotationSpeed.bind(this));
        }

        // cal/cbl: child lock
        if (this.humidifier.childLockGetName && this.humidifier.childLockSetName) {
            this.humidifierService
                .addCharacteristic(Characteristic.LockPhysicalControls)
                .on('get', this.getChildLock.bind(this))
                .on('set', this.setChildLock.bind(this));
        }

        // cal/cbl: drying mode
        // mjjsql: Led status
        if (this.humidifier.switch1GetName && this.humidifier.switch1SetName) {
            this.humidifierService
                .addCharacteristic(Characteristic.SwingMode)
                .on('get', this.getSwitch1.bind(this))
                .on('set', this.setSwitch1.bind(this));
        }

        // Temperature sensor
        if (options.showTemperature && this.humidifier.temperatureGetName) {
            let temperature = new Service.TemperatureSensor(options.nameTemperature);
            temperature
                .getCharacteristic(Characteristic.CurrentTemperature)
                .on('get', this.getCurrentTemperature.bind(this));

            this.services.push(temperature);
        }

        // Humidity sensor
        if (options.showHumidity) {
            let humidity = new Service.HumiditySensor(options.nameHumidity)
            humidity
                .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .on('get', this.getCurrentRelativeHumidity.bind(this))

            this.services.push(humidity)
        }

        this.discover();
    }

    getServices() {
        return this.services;
    }

    debug(message) {
        this.log.debug(message);
    }

    async discover() {
        try {
            this.device = await miio.device({ address: this.ip, token: this.token });
            this.debug(`Discovered model: ${this.device.miioModel}`);
        } catch (e) {
            this.log.error('Fail to discover the device. Retry in 1 minute', e);
            setTimeout(() => { this.discover() }, 60000);
        }
    }

    verifyDevice(callback) {
        if (!this.device) {
            callback(new Error('No humidifier is discovered'));
            return false;
        }
        return true;
    }

    async getActive(callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const [power] = await this.device.call('get_prop', [this.humidifier.powerGetName]);
            const activity = this.humidifier.convertPowerToActivity(power);
            this.debug(`get power: ${power} (activity: ${activity})`);

            callback(null, activity);
        } catch (e) {
            this.log.error('getActive', e);
            callback(e);
        }
    }

    async setActive(activity, callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const power = this.humidifier.convertActivityToPower(activity);
            const [result] = await this.device.call(this.humidifier.powerSetName, [power]);
            this.debug(`set power: ${power} (activity: ${activity})`);

            if (result !== 'ok')
                throw new Error(result);

            callback();
        } catch (e) {
            this.log.error('setActive', e);
            callback(e);
        }
    }

    async getCurrentHumidifierState(callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const [power] = await this.device.call('get_prop', [this.humidifier.powerGetName]);
            const state = this.humidifier.convertPowerToHumidifierState(power);
            this.debug(`get humidifier state: ${state}`);

            callback(null, state);
        } catch (e) {
            this.log.error('getCurrentHumidifierState', e);
            callback(e);
        }
    }

    async getCurrentRelativeHumidity(callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const [humidity] = await this.device.call('get_prop', [this.humidifier.humidityGetName]);
            this.debug(`get humidity: ${humidity}%`);

            callback(null, humidity);
        } catch (e) {
            this.log.error('getCurrentRelativeHumidity', e);
            callback(e);
        }
    }

    async getTargetRelativeHumidity(callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const [humidity] = await this.device.call('get_prop', [this.humidifier.targetHumidityGetName]);
            this.debug(`get target humidity: ${humidity}%`);

            callback(null, humidity);
        } catch (e) {
            this.log.error('getTargetRelativeHumidity', e);
            callback(e);
        }
    }

    async setTargetRelativeHumidity(value, callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }
        try {
            if (value < this.humidifier.targetHumidityLimits.Min) {
                value = this.humidifier.targetHumidityLimits.Min;
            }
            else if (value > this.humidifier.targetHumidityLimits.Max) {
                value = this.humidifier.targetHumidityLimits.Max;
            }
            const [mode] = await this.device.call('get_prop', [this.humidifier.modeGetName]);
            const speed = this.humidifier.convertModeToSpeed(mode);
            if (speed !== 4 && this.humidifier.modeLimits.Max === 4) {
                this.setRotationSpeed(this.humidifier.convertSpeedToMode(4), () => { });
                this.debug(`set mode: auto`);
            }

            const [result] = await this.device.call(this.humidifier.targetHumiditySetName, [value]);
            this.debug(`set target humidity: ${value}%`);

            if (result !== 'ok')
                throw new Error(result);

            callback();

        } catch (e) {
            this.log.error('setTargetRelativeHumidity', e);
            callback(e);
        }
    }

    async getWaterLevel(callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            let [waterLevel] = await this.device.call('get_prop', [this.humidifier.waterLevelGetName]);
            waterLevel = this.humidifier.convertWaterLevel(waterLevel);
            this.debug(`get water level: ${waterLevel}`);
            callback(null, waterLevel);
        } catch (e) {
            this.log.error('getWaterLevel', e);
            callback(e);
        }
    }

    async getRotationSpeed(callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const [mode] = await this.device.call('get_prop', [this.humidifier.modeGetName]);
            const speed = this.humidifier.convertModeToSpeed(mode);
            this.debug(`get mode: ${mode} (speed: ${speed})`);

            callback(null, speed);
        } catch (e) {
            this.log.error('getRotationSpeed', e);
            callback(e);
        }
    }

    async setRotationSpeed(speed, callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const activity = this.humidifierService.getCharacteristic(Characteristic.Active).value;

            let result;

            if (speed > 0) {
                if (activity === Characteristic.Active.INACTIVE) {
                    await this.setActive(Characteristic.Active.ACTIVE, () => { });
                    this.debug(`set mode: turned on`);
                }
                let mode = this.humidifier.convertSpeedToMode(speed);
                [result] = await this.device.call(this.humidifier.modeSetName, [mode]);
                this.debug(`set mode: ${mode} (speed: ${speed})`);
            } else {
                await this.setActive(Characteristic.Active.INACTIVE, (error) => { result = error === undefined ? 'ok' : error });
                this.debug(`set mode: turned off`);
            }

            if (result !== 'ok')
                throw new Error(result);

            callback();
        } catch (e) {
            this.log.error('setRotationSpeed', e);
            callback(e);
        }
    }

    async getCurrentTemperature(callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            let [temperature] = await this.device.call('get_prop', [this.humidifier.temperatureGetName])
            temperature = this.humidifier.convertTemperature(temperature);
            this.debug(`get temperature: ${temperature}`);

            callback(null, temperature);
        } catch (e) {
            this.log.error('getCurrentTemperature', e);
            callback(e);
        }
    }

    async getChildLock(callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const [locked] = await this.device.call('get_prop', [this.humidifier.childLockGetName]);
            const childLock = this.humidifier.convertLockedToChildLock(locked);
            this.debug(`get child lock: ${locked} (child lock: ${childLock})`);

            callback(null, childLock);
        } catch (e) {
            this.log.error('getChildLock', e);
            callback(e);
        }
    }

    async setChildLock(childLock, callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const locked = this.humidifier.convertChildLockToLocked(childLock);
            const [result] = await this.device.call(this.humidifier.childLockSetName, [locked]);
            this.debug(`set child lock: ${locked} (child lock: ${childLock})`);

            if (result !== 'ok')
                throw new Error(result);

            callback();
        } catch (e) {
            this.log.error('setChildLock', e);
            callback(e);
        }
    }

    async getSwitch1(callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const [switch1] = await this.device.call('get_prop', [this.humidifier.switch1GetName]);
            const swingMode = this.humidifier.convertSwitch1ToSwingMode(switch1);
            this.debug(`get switch1: ${switch1} (swing mode: ${swingMode})`);

            callback(null, swingMode);
        } catch (e) {
            this.log.error('getSwitch1', e);
            callback(e);
        }
    }

    async setSwitch1(swingMode, callback) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const switch1 = this.humidifier.convertSwingModeToSwitch1(swingMode);
            const [result] = await this.device.call(this.humidifier.switch1SetName, [switch1]);
            this.debug(`set switch1: ${switch1} (swing mode: ${swingMode})`);

            if (result !== 'ok')
                throw new error(result);

            callback();
        } catch (e) {
            this.log.error('setSwitch1', e);
            callback(e);
        }
    }
}