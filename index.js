const miio = require('miio');

const defaults = {
    name: 'Humidifier',
    showTemperature: true,
    nameTemperature: 'Temperature',
    showHumidity: true,
    nameHumidity: 'Humidity'
};

// Note: the `auto` mode can be set only in the Smartmi Evaporative Humidifier
const speedLevels = ['off', 'silent', 'medium', 'high', 'auto'];

let Service, Characteristic;

module.exports = homebridge => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-mi-humidifier', 'MiHumidifier', MiHumidifier);
};

class MiHumidifier {
    constructor(log, config) {
        if (!config.ip) throw new Error('Your must provide IP address of the Humidifier');
        if (!config.token) throw new Error('Your must provide token of the Humidifier');
        if (!config.model) throw new Error('Your must provide model of the Humidifier (v1/ca1/cb1)');

        let options = { ...defaults, ...config },
            info = new Service.AccessoryInformation(),
            device = new Service.HumidifierDehumidifier(options.name),
            isModel2 = /ca1|cb1/.test(options.model);

        this.log = log;
        this.ip = config.ip;
        this.token = config.token;
        this.services = [device, info];

        // Device info
        info
            .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
            .setCharacteristic(Characteristic.Model, 'Humidifier')
            .setCharacteristic(Characteristic.SerialNumber, 'Undefined');

        // Active
        device
            .getCharacteristic(Characteristic.Active)
            .on('get', this.getActive.bind(this))
            .on('set', this.setActive.bind(this));

        // Current state
        device
            .getCharacteristic(Characteristic.CurrentHumidifierDehumidifierState)
            .on('get', this.getCurrentHumidifierState.bind(this));

        // Target state (only humidifier is supported)
        device
            .getCharacteristic(Characteristic.TargetHumidifierDehumidifierState)
            .setValue(Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER);

        // Current relative humidity
        device
            .getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', this.getCurrentRelativeHumidity.bind(this));

        // Target relative humidity
        // Note: this Characteristic cannot be viewed in the Home.app, but it can be changed using Siri Voice Commands or by using some 3rd Party HomeKit apps
        device
            .addCharacteristic(Characteristic.TargetRelativeHumidity)
            .on('get', this.getTargetRelativeHumidity.bind(this))
            .on('set', this.setTargetRelativeHumidity.bind(this));

        // Current water level (remaining water level)
        // Note: this characteristic works only for Smartmi Evaporative Humidifier
        isModel2 && device
            .getCharacteristic(Characteristic.WaterLevel)
            .on('get', this.getWaterLevel.bind(this));

        // Rotation speed
        device
            .getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                minValue: 0,
                maxValue: isModel2 ? 4 : 3,
                minStep: 1
            })
            .on('get', this.getRotationSpeed.bind(this))
            .on('set', this.setRotationSpeed.bind(this));

        // Child lock
        // Note: this characteristic works only for Smartmi Evaporative Humidifier
        isModel2 && device
            .addCharacteristic(Characteristic.LockPhysicalControls)
            .on('get', this.getLockPhysicalControls.bind(this))
            .on('set', this.setLockPhysicalControls.bind(this));

        // Drying mode
        // Note: this characteristic works only for Smartmi Evaporative Humidifier
        // TODO: maybe here we need to use something else instead of SwingMode, but this is the closest Characteristic type
        isModel2 && device
            .addCharacteristic(Characteristic.SwingMode)
            .on('get', this.getDryingMode.bind(this))
            .on('set', this.setDryingMode.bind(this));

        // Temperature sensor
        if (options.showTemperature) {
            let temperature = new Service.TemperatureSensor(options.nameTemperature),
                handler = options.model === 'cb1' ? this.getCurrentTemperatureCB1 : this.getCurrentTemperature;

            temperature
                .getCharacteristic(Characteristic.CurrentTemperature)
                .on('get', handler.bind(this));

            this.services.push(temperature);
        }

        // Humidity sensor
        if (options.showHumidity){
            let humidity = new Service.HumiditySensor(options.nameHumidity);

            humidity
                .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .on('get', this.getCurrentRelativeHumidity.bind(this));

            this.services.push(humidity);
        }

        void this.discover();
    }

    getServices() {
        return this.services;
    }

    async discover() {
        try {
            this.device = await miio.device({ address: this.ip, token: this.token });
        } catch (err) {
            this.log.error('Fail to discover the device. Retry in 1 minute\n', err);
            setTimeout(() => { this.discover(); }, 60000);
        }
    }

    async getActive(callback) {
        try {
            const [power] = await this.device.call('get_prop', ['power']),
                state = power === 'on' ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;

            callback(null, state);
        } catch (err) {
            this.log.error('getActive', err);
            callback(err);
        }
    }

    async setActive(state, callback) {
        try {
            const power = state === Characteristic.Active.ACTIVE ? 'on' : 'off',
                [result] = await this.device.call('set_power', [power]);

            if (result !== 'ok') throw new Error(result);

            callback();
        } catch (err) {
            this.log.error('setActive', err);
            callback(err);
        }
    }

    async getCurrentHumidifierState(callback) {
        try {
            const [power] = await this.device.call('get_prop', ['power']),
                state = power === 'on' ?
                    Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING :
                    Characteristic.CurrentHumidifierDehumidifierState.INACTIVE;

            callback(null, state);
        } catch (err) {
            this.log.error('getCurrentHumidifierState', err);
            callback(err);
        }
    }

    async getCurrentRelativeHumidity(callback) {
        try {
            const [humidity] = await this.device.call('get_prop', ['humidity']);

            callback(null, humidity);
        } catch (err) {
            this.log.error('getCurrentRelativeHumidity', err);
            callback(err);
        }
    }

    async getTargetRelativeHumidity(callback) {
        try {
            const [limit_hum] = await this.device.call('get_prop', ['limit_hum']);

            callback(null, limit_hum);
        } catch (err) {
            this.log.error('getTargetRelativeHumidity', err);
            callback(err);
        }
    }

    async setTargetRelativeHumidity(value, callback) {
        try {
            const [result] = await this.device.call('set_limit_hum', [value]);

            if (result !== 'ok') throw new Error(result);

            callback();
        } catch (err) {
            this.log.error('setTargetRelativeHumidity', err);
            callback(err);
        }
    }

    async getWaterLevel(callback) {
        try {
            const [waterLevel] = await this.device.call('get_prop', ['depth']);

            // TODO: magic number
            callback(null, waterLevel / 1.2);
        } catch (err) {
            this.log.error('getWaterLevel', err);
            callback(err);
        }
    }

    async getRotationSpeed(callback) {
        try {
            const mode = await this.device.call('get_prop', ['mode']),
                speed = speedLevels.findIndex(item => item === mode);

            callback(null, speed);
        } catch (err) {
            this.log.error('getRotationSpeed', err);
            callback(err);
        }
    }

    async setRotationSpeed(value, callback) {
        try {
            const [power] = await this.device.call('get_prop', ['power']);

            let result;

            if (value > 0){
                power === 'off' && await this.device.call('set_power', ['on']);
                [result] = await this.device.call('set_mode', [speedLevels[value]]);
            } else {
                [result] = await this.device.call('set_power', ['off'])
            }

            if (result !== 'ok') throw new Error(result);

            callback()
        } catch (err) {
            this.log.error('setRotationSpeed', err);
            callback(err);
        }
    }

    async getCurrentTemperature(callback) {
        try {
            const [temperature] = await this.device.call('get_prop', ['temp_dec']);

            // TODO: magic number
            callback(null, temperature / 10);
        } catch (err) {
            this.log.error('getCurrentTemperature', err);
            callback(err);
        }
    }

    async getCurrentTemperatureCB1(callback) {
        try {
            const [temperature] = await this.device.call('get_prop', ['temperature']);

            callback(null, temperature);
        } catch (err) {
            this.log.error('getCurrentTemperatureCB1', err);
            callback(err);
        }
    }

    async getLockPhysicalControls(callback) {
        try {
            const [locked] = await this.device.call('get_prop', ['child_lock']),
                state = locked === 'on' ?
                    Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED :
                    Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED;

            callback(null, state);
        } catch (err) {
            this.log.error('getLockPhysicalControls', err);
            callback(err);
        }
    }

    async setLockPhysicalControls(state, callback) {
        try {
            const locked = state === Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED ? 'on' : 'off',
                [result] = await this.device.call('set_child_lock', [locked]);

            if (result !== 'ok') throw new Error(result);

            callback();
        } catch (err) {
            this.log.error('setLockPhysicalControls', err);
            callback(err);
        }
    }

    async getDryingMode(callback) {
        try {
            const [mode] = await this.device.call('get_prop', ['dry']),
                state = mode === 'on' ?
                    Characteristic.SwingMode.SWING_ENABLED :
                    Characteristic.SwingMode.SWING_DISABLED;

            callback(null, state);
        } catch (err) {
            this.log.error('getDryingMode', err);
            callback(err);
        }
    }

    async setDryingMode(state, callback) {
        try {
            const mode = state === Characteristic.SwingMode.SWING_ENABLED ? 'on' : 'off',
                [result] = await this.device.call('set_dry', [mode]);

            if (result !== 'ok') throw new Error(result);

            callback();
        } catch (err) {
            this.log.error('setDryingMode', err);
            callback(err);
        }
    }
}
