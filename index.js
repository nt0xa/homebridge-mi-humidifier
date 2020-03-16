const miio = require('miio')

const defaults = {
  model: 'v1',
  name: 'Humidifier',
  showTemperature: false,
  nameTemperature: 'Temperature',
  showHumidity: false,
  nameHumidity: 'Humidity'
}

// Note: the `auto` mode can be set only for the Smartmi Evaporative Humidifier
const speedLevels = ['off', 'silent', 'medium', 'high', 'auto']

let Service, Characteristic

module.exports = homebridge => {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-mi-humidifier', 'MiHumidifier', MiHumidifier)
}

class MiHumidifier {
  constructor(log, config) {
    if (!config.ip) throw new Error('Your must provide IP address of the Humidifier')
    if (!config.token) throw new Error('Your must provide token of the Humidifier')

    let options = { ...defaults, ...config },
      info = new Service.AccessoryInformation(),
      device = new Service.HumidifierDehumidifier(options.name),
      isModel2 = /ca1|cb1/.test(options.model)

    this.log = log
    this.ip = config.ip
    this.token = config.token
    this.services = [device, info]

    // Device info
    info
      .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
      .setCharacteristic(Characteristic.Model, 'Humidifier')
      .setCharacteristic(Characteristic.SerialNumber, 'Undefined')

    // Active
    device
      .getCharacteristic(Characteristic.Active)
      .on('get', this.getActive.bind(this))
      .on('set', this.setActive.bind(this))

    // Current state
    device
      .getCharacteristic(Characteristic.CurrentHumidifierDehumidifierState)
      .setProps({
        validValues: [0,2]
      })
      .on('get', this.getCurrentHumidifierState.bind(this))

    // Target state (only humidifier is supported)
    device
      .getCharacteristic(Characteristic.TargetHumidifierDehumidifierState)
      .setProps({
        validValues: [1]
      })
      .setValue(Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER)

    // Current relative humidity
    device
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', this.getCurrentRelativeHumidity.bind(this))

    // Target relative humidity
    device
      .getCharacteristic(Characteristic.RelativeHumidityHumidifierThreshold)
      .setProps({
        minValue: 30,
        maxValue: 80,
        minStep: 10,
        validValues: [30, 40, 50, 60, 70, 80]
      })
      .on('get', this.getTargetRelativeHumidity.bind(this))
      .on('set', this.setTargetRelativeHumidity.bind(this))

    // Current water level (remaining water level)
    // Note: this characteristic works only for Smartmi Evaporative Humidifier
    isModel2 && device
      .getCharacteristic(Characteristic.WaterLevel)
      .on('get', this.getWaterLevel.bind(this))

    // Rotation speed
    device
      .getCharacteristic(Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: isModel2 ? 4 : 3,
        minStep: 1
      })
      .on('get', this.getRotationSpeed.bind(this))
      .on('set', this.setRotationSpeed.bind(this))

    // Child lock
    // Note: this characteristic works only for Smartmi Evaporative Humidifier
    isModel2 && device
      .addCharacteristic(Characteristic.LockPhysicalControls)
      .on('get', this.getLockPhysicalControls.bind(this))
      .on('set', this.setLockPhysicalControls.bind(this))

    // Drying mode
    // Note: this characteristic works only for Smartmi Evaporative Humidifier
    // TODO: maybe here we need to use something else instead of SwingMode, but this is the closest Characteristic type
    isModel2 && device
      .addCharacteristic(Characteristic.SwingMode)
      .on('get', this.getDryingMode.bind(this))
      .on('set', this.setDryingMode.bind(this))

    // Temperature sensor
    if (options.showTemperature) {
      let temperature = new Service.TemperatureSensor(options.nameTemperature),
        handler = options.model === 'cb1' ? this.getCurrentTemperatureCB1 : this.getCurrentTemperature

      temperature
        .getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', handler.bind(this))

      this.services.push(temperature)
    }

    // Humidity sensor
    if (options.showHumidity){
      let humidity = new Service.HumiditySensor(options.nameHumidity)

      humidity
        .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .on('get', this.getCurrentRelativeHumidity.bind(this))

      this.services.push(humidity)
    }

    this.discover()
  }

  getServices() {
    return this.services
  }

  async discover() {
    try {
      this.device = await miio.device({ address: this.ip, token: this.token })
    } catch (e) {
      this.log.error('Fail to discover the device. Retry in 1 minute', e)
      setTimeout(() => { this.discover() }, 60000)
    }
  }

  async getActive(callback) {
    try {
      const [ power ] = await this.device.call('get_prop', ['power']),
        state = power === 'on' ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE

      callback(null, state)
    } catch (e) {
      this.log.error('getActive', e)
      callback(e)
    }
  }

  async setActive(state, callback) {
    try {
      const power = state === Characteristic.Active.ACTIVE ? 'on' : 'off',
        [ result ] = await this.device.call('set_power', [power])

      if (result !== 'ok')
        throw new Error(result)

      callback()
    } catch (e) {
      this.log.error('setActive', e)
      callback(e)
    }
  }

  async getCurrentHumidifierState(callback) {
    try {
      const [ power ] = await this.device.call('get_prop', ['power']),
        state = power === 'on'
          ? Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING
          : Characteristic.CurrentHumidifierDehumidifierState.INACTIVE

      callback(null, state)
    } catch (e) {
      this.log.error('getCurrentHumidifierState', e)
      callback(e)
    }
  }

  async getCurrentRelativeHumidity(callback) {
    try {
      const [ humidity ] = await this.device.call('get_prop', ['humidity'])

      callback(null, humidity)
    } catch (e) {
      this.log.error('getCurrentRelativeHumidity', e)
      callback(e)
    }
  }

  async getTargetRelativeHumidity(callback) {
    try {
      const [ limit_hum ] = await this.device.call('get_prop', ['limit_hum'])

      callback(null, limit_hum)
    } catch (e) {
      this.log.error('getTargetRelativeHumidity', e)
      callback(e)
    }
  }

  async setTargetRelativeHumidity(value, callback) {
    try {
      const [ result ] = await this.device.call('set_limit_hum', [value])

      if (result !== 'ok')
        throw new Error(result)

      callback()
    } catch (e) {
      this.log.error('setTargetRelativeHumidity', e)
      callback(e)
    }
  }

  async getWaterLevel(callback) {
    try {
      const [ waterLevel ] = await this.device.call('get_prop', ['depth'])

      callback(null, waterLevel / 1.2)
    } catch (e) {
      this.log.error('getWaterLevel', e)
      callback(e)
    }
  }

  async getRotationSpeed(callback) {
    try {
      const [ mode ] = await this.device.call('get_prop', ['mode']),
        speed = speedLevels.findIndex(item => item === mode)

      callback(null, speed)
    } catch (e) {
      this.log.error('getRotationSpeed', e)
      callback(e)
    }
  }

  async setRotationSpeed(value, callback) {
    try {
      const [ power ] = await this.device.call('get_prop', ['power'])

      let result

      if (value > 0) {
        if (power === 'off') {
          await this.device.call('set_power', ['on'])
        }
        [ result ] = await this.device.call('set_mode', [speedLevels[value]])
      } else {
        [ result ] = await this.device.call('set_power', ['off'])
      }

      if (result !== 'ok')
        throw new Error(result)

      callback()
    } catch (e) {
      this.log.error('setRotationSpeed', e)
      callback(e)
    }
  }

  async getCurrentTemperature(callback) {
    try {
      const [ temperature ] = await this.device.call('get_prop', ['temp_dec'])

      callback(null, temperature / 10)
    } catch (e) {
      this.log.error('getCurrentTemperature', e)
      callback(e)
    }
  }

  async getCurrentTemperatureCB1(callback) {
    try {
      const [ temperature ] = await this.device.call('get_prop', ['temperature'])

      callback(null, temperature)
    } catch (e) {
      this.log.error('getCurrentTemperatureCB1', e)
      callback(e)
    }
  }

  async getLockPhysicalControls(callback) {
    try {
      const [ locked ] = await this.device.call('get_prop', ['child_lock']),
        state = locked === 'on'
          ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
          : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED

      callback(null, state)
    } catch (e) {
      this.log.error('getLockPhysicalControls', e)
      callback(e)
    }
  }

  async setLockPhysicalControls(state, callback) {
    try {
      const locked = state === Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED ? 'on' : 'off',
        [ result ] = await this.device.call('set_child_lock', [locked])

      if (result !== 'ok')
        throw new Error(result)

      callback()
    } catch (e) {
      this.log.error('setLockPhysicalControls', e)
      callback(e)
    }
  }

  async getDryingMode(callback) {
    try {
      const [ mode ] = await this.device.call('get_prop', ['dry']),
        state = mode === 'on'
          ? Characteristic.SwingMode.SWING_ENABLED
          : Characteristic.SwingMode.SWING_DISABLED

      callback(null, state)
    } catch (e) {
      this.log.error('getDryingMode', e)
      callback(e)
    }
  }

  async setDryingMode(state, callback) {
    try {
      const mode = state === Characteristic.SwingMode.SWING_ENABLED ? 'on' : 'off',
        [ result ] = await this.device.call('set_dry', [mode])

      if (result !== 'ok')
        throw new Error(result)

      callback()
    } catch (e) {
      this.log.error('setDryingMode', e)
      callback(e)
    }
  }
}
