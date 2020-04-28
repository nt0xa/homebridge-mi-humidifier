// Characteristics: http://auto.caitken.com/posts/2018/09/09/nodered-homekit-characteristics-reference
const MiHumidifierV1 = require('./devices/MiHumidifierV1');
const MiHumidifierCA1 = require('./devices/MiHumidifierCA1');
const MiHumidifierCB1 = require('./devices/MiHumidifierCB1');
const MiHumidifierMJJSQ = require('./devices/MiHumidifierMJJSQ');
const { CharacteristicOperation } = require('./devices/constants');
const miio = require('miio')

const defaults = {
    model: 'v1',
    name: 'Humidifier',
    showTemperature: false,
    nameTemperature: 'Temperature',
    showHumidity: false,
    nameHumidity: 'Humidity'
};

const idleRequestTimeout = 500;
const repeatRequestTimeout = 200;
const repeatAttemptsCount = 5;

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

        const SUPPORTED_HUMIDIFIERS = [new MiHumidifierV1(Characteristic), new MiHumidifierCA1(Characteristic), new MiHumidifierCB1(Characteristic), new MiHumidifierMJJSQ(Characteristic)];

        let options = { ...defaults, ...config };
        this.infoService = new Service.AccessoryInformation();
        this.humidifierService = new Service.HumidifierDehumidifier(options.name);

        this.log = log;
        this.ip = config.ip;
        this.token = config.token;
        this.services = [this.humidifierService, this.infoService];
        this.humidifier = SUPPORTED_HUMIDIFIERS.find(element => element.version === options.model);

        // Device info
        this.infoService
            .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
            .setCharacteristic(Characteristic.Model, config.model);

        // Active
        this.registerCharacteristic(CharacteristicOperation.GET, this.humidifierService, Characteristic.Active, this.humidifier.powerGetName, this.getActive);
        this.registerCharacteristic(CharacteristicOperation.SET, this.humidifierService, Characteristic.Active, this.humidifier.powerSetName, this.setActive);

        // Current state
        this.registerCharacteristic(CharacteristicOperation.GET, this.humidifierService, Characteristic.CurrentHumidifierDehumidifierState, true, this.getCurrentHumidifierState, { validValues: [0, 2] });

        // Target state (only humidifier is supported)
        this.humidifierService
            .getCharacteristic(Characteristic.TargetHumidifierDehumidifierState)
            .setProps({ validValues: [1] })
            .setValue(Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER);

        // Current relative humidity
        this.registerCharacteristic(CharacteristicOperation.GET, this.humidifierService, Characteristic.CurrentRelativeHumidity, this.humidifier.humidityGetName, this.getCurrentRelativeHumidity);

        // Target relative humidity
        this.registerCharacteristic(CharacteristicOperation.GET, this.humidifierService, Characteristic.RelativeHumidityHumidifierThreshold, this.humidifier.targetHumidityGetName, this.getTargetRelativeHumidity);
        this.registerCharacteristic(CharacteristicOperation.SET, this.humidifierService, Characteristic.RelativeHumidityHumidifierThreshold, this.humidifier.targetHumiditySetName, this.setTargetRelativeHumidity);

        // Current water level (remaining water level)
        this.registerCharacteristic(CharacteristicOperation.GET, this.humidifierService, Characteristic.WaterLevel, this.humidifier.waterLevelGetName, this.getWaterLevel,
            this.humidifier.waterLevelLimits ? { minValue: this.humidifier.waterLevelLimits.Min, maxValue: this.humidifier.waterLevelLimits.Max } : {});

        // Rotation speed
        this.registerCharacteristic(CharacteristicOperation.GET, this.humidifierService, Characteristic.RotationSpeed, this.humidifier.modeGetName, this.getRotationSpeed,
            this.humidifier.modeLimits ? { minValue: 0, maxValue: this.humidifier.modeLimits.Max, minStep: 1 } : {});
        this.registerCharacteristic(CharacteristicOperation.SET, this.humidifierService, Characteristic.RotationSpeed, this.humidifier.modeSetName, this.setRotationSpeed);

        // ca1/cb1: child lock
        this.registerCharacteristic(CharacteristicOperation.GET, this.humidifierService, Characteristic.LockPhysicalControls, this.humidifier.childLockGetName, this.getChildLock);
        this.registerCharacteristic(CharacteristicOperation.SET, this.humidifierService, Characteristic.LockPhysicalControls, this.humidifier.childLockSetName, this.setChildLock);

        // ca1/cb1: drying mode
        // mjjsql: Led status
        this.registerCharacteristic(CharacteristicOperation.GET, this.humidifierService, Characteristic.SwingMode, this.humidifier.switch1GetName, this.getSwitch1);
        this.registerCharacteristic(CharacteristicOperation.SET, this.humidifierService, Characteristic.SwingMode, this.humidifier.switch1SetName, this.setSwitch1);

        // Temperature sensor
        if (options.showTemperature && this.humidifier.temperatureGetName) {
            let temperatureService = new Service.TemperatureSensor(options.nameTemperature);
            this.registerCharacteristic(CharacteristicOperation.GET, temperatureService, Characteristic.CurrentTemperature, this.humidifier.temperatureGetName, this.getCurrentTemperature);
            this.services.push(temperatureService);
        }

        // Humidity sensor
        if (options.showHumidity) {
            let humidityService = new Service.HumiditySensor(options.nameHumidity)
            this.registerCharacteristic(CharacteristicOperation.GET, humidityService, Characteristic.CurrentRelativeHumidity, true, this.getCurrentRelativeHumidity);
            this.services.push(humidityService)
        }

        this.discover();
    }

    getServices() {
        return this.services;
    }

    debug(message) {
        this.log.debug(message);
    }

    sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    registerCharacteristic(operation, service, characteristicName, doRegistration, callback, setPropsValue) {
        if (doRegistration) {
            const characteristic = service.getCharacteristic(characteristicName);
            if (setPropsValue) {
                characteristic.setProps(setPropsValue);
            }
            characteristic.on(operation === CharacteristicOperation.GET ? 'get' : 'set', callback.bind(this));
        }
    }

    async discover() {
        try {
            this.device = await miio.device({ address: this.ip, token: this.token });
            this.debug(`Discovered model: ${this.device.miioModel}`);
        } catch (e) {
            this.log.warn('Fail to discover the device. Retry in 1 minute', e);
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

    async getCharacteristicValueAttempt(devicePropertyName, resolve, reject, attemptNumber) {
        this.device.call('get_prop', [devicePropertyName])
            .then(value => resolve({ attempt: attemptNumber, value: value }))
            .catch(error => {
                if ((error.message === 'busy.') && (attemptNumber < repeatAttemptsCount + 1)) {
                    this.sleep(repeatRequestTimeout)
                        .then(() => this.getCharacteristicValueAttempt(devicePropertyName, resolve, reject, attemptNumber + 1));
                    return;
                }
                reject(error);
            });
    }

    async getCharacteristicValue(devicePropertyName) {
        let isDone = false;

        // "this.device.call" hangs after idle, so there is getCharacteristicDelayedPromise to be started with "idleRequestTimeout" delay
        const getCharacteristicPromise = new Promise((resolve) => {
            this.device.call('get_prop', [devicePropertyName])
                .then(value => {
                    isDone = true;
                    resolve({ attempt: 1, value: value });
                })
                .catch(_ => { });
        });
        const getCharacteristicDelayedPromise = new Promise((resolve, reject) => {
            this.sleep(idleRequestTimeout)
                .then(() => {
                    if (!isDone) {
                        this.getCharacteristicValueAttempt(devicePropertyName, resolve, reject, 2);
                    }
                });
        });
        return await Promise.race([getCharacteristicPromise, getCharacteristicDelayedPromise]);
    }

    async getCharacteristic(functionName, devicePropertyName, callback, convertToHomebrdigeValue, getMessage) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const result = await this.getCharacteristicValue(devicePropertyName);
            const [deviceValue] = result.value;
            const homebridgeValue = convertToHomebrdigeValue(deviceValue);
            const message = getMessage(deviceValue, homebridgeValue) + `. Attempt #${result.attempt}`;
            this.debug(message);

            callback(null, homebridgeValue);
        } catch (e) {
            this.log.warn(functionName, e);
            callback(e);
        }
    }

    async setCharacteristic(functionName, devicePropertyName, callback, homebridgeValue, convertToDeviceValue, getMessage) {
        if (!this.verifyDevice(callback)) {
            return;
        }

        try {
            const deviceValue = convertToDeviceValue(homebridgeValue);
            const [result] = await this.device.call(devicePropertyName, [deviceValue]);
            const message = getMessage(deviceValue, homebridgeValue);
            this.debug(message);

            if (result !== 'ok')
                throw new Error(result);

            callback();
        } catch (e) {
            this.log.warn(functionName, e);
            callback(e);
        }
    }

    async getActive(callback) {
        await this.getCharacteristic(
            'getActive',
            this.humidifier.powerGetName,
            callback,
            power => this.humidifier.convertPowerToActivity(power),
            (power, activity) => `get power: ${power} (activity: ${activity})`);
    }

    async setActive(activity, callback) {
        await this.setCharacteristic(
            'setActive',
            this.humidifier.powerSetName,
            callback,
            activity,
            activity => this.humidifier.convertActivityToPower(activity),
            (power, activity) => `set power: ${power} (activity: ${activity})`);
    }

    async getCurrentHumidifierState(callback) {
        await this.getCharacteristic(
            'getCurrentHumidifierState',
            this.humidifier.powerGetName,
            callback,
            power => this.humidifier.convertPowerToHumidifierState(power),
            (power, _) => `get humidifier state: ${power}`);
    }

    async getCurrentRelativeHumidity(callback) {
        await this.getCharacteristic(
            'getCurrentRelativeHumidity',
            this.humidifier.humidityGetName,
            callback,
            humidity => humidity,
            (humidity, _) => `get humidity: ${humidity}%`);
    }

    async getTargetRelativeHumidity(callback) {
        await this.getCharacteristic(
            'getTargetRelativeHumidity',
            this.humidifier.targetHumidityGetName,
            callback,
            humidity => humidity,
            (humidity, _) => `get target humidity: ${humidity}%`);
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
        await this.getCharacteristic(
            'getWaterLevel',
            this.humidifier.waterLevelGetName,
            callback,
            level => this.humidifier.convertWaterLevel(level),
            (waterLevel, convertedWaterLevel) => `get water level: ${waterLevel} (converted: ${convertedWaterLevel})`);
    }

    async getRotationSpeed(callback) {
        await this.getCharacteristic(
            'getRotationSpeed',
            this.humidifier.modeGetName,
            callback,
            mode => this.humidifier.convertModeToSpeed(mode),
            (mode, speed) => `get mode: ${mode} (speed: ${speed})`);
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
        await this.getCharacteristic(
            'getCurrentTemperature',
            this.humidifier.temperatureGetName,
            callback,
            temperature => this.humidifier.convertTemperature(temperature),
            (temperature, convertedTemperature) => `get temperature: ${temperature} (converted: ${convertedTemperature})`);
    }

    async getChildLock(callback) {
        await this.getCharacteristic(
            'getChildLock',
            this.humidifier.childLockGetName,
            callback,
            locked => this.humidifier.convertLockedToChildLock(locked),
            (locked, childLock) => `get child lock: ${locked} (child lock: ${childLock})`);
    }

    async setChildLock(childLock, callback) {
        await this.setCharacteristic(
            'setChildLock',
            this.humidifier.childLockSetName,
            callback,
            childLock,
            childLock => this.humidifier.convertChildLockToLocked(childLock),
            (locked, childLock) => `set child lock: ${locked} (child lock: ${childLock})`);
    }

    async getSwitch1(callback) {
        await this.getCharacteristic(
            'getSwitch1',
            this.humidifier.switch1GetName,
            callback,
            switch1 => this.humidifier.convertSwitch1ToSwingMode(switch1),
            (switch1, swingMode) => `get switch1: ${switch1} (swing mode: ${swingMode})`);
    }

    async setSwitch1(swingMode, callback) {
        await this.setCharacteristic(
            'setSwitch1',
            this.humidifier.switch1SetName,
            callback,
            swingMode,
            swingMode => this.humidifier.convertSwingModeToSwitch1(swingMode),
            (switch1, swingMode) => `set switch1: ${switch1} (swing mode: ${swingMode})`);
    }
}