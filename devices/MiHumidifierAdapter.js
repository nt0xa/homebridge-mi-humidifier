const miio = require('miio');
const idleRequestTimeout = 500;
const repeatRequestTimeout = 200;
const repeatAttemptsCount = 5;

module.exports = class {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;

    let Service = this.api.hap.Service;
    let Characteristic = this.api.hap.Characteristic;

    // Properties
    this.ip = this.config.ip;
    this.token = this.config.token;

    this.device = null;

    // InfoService
    this.infoService = new Service.AccessoryInformation();
    this.infoService.setCharacteristic(Characteristic.Manufacturer, 'Xiaomi').
        setCharacteristic(Characteristic.Model, config.model).
        setCharacteristic(Characteristic.SerialNumber, config.ip);

    // HumidifierService
    this.humidifierService = new Service.HumidifierDehumidifier(config.name);
    this.humidifierService.getCharacteristic(
        Characteristic.TargetHumidifierDehumidifierState).
        setProps({validValues: [1]}).
        setValue(Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER);

    // OptionalServices
    this.optionalServices = [];

  }

  // private
  registerCharacteristic(cconfig) {
    const characteristic = cconfig.service.getCharacteristic(cconfig.type);
    if (cconfig.props) {
      characteristic.setProps(cconfig.props);
    }

    if ('get' in cconfig) {
      let cconfigget = cconfig.get;
      characteristic.on('get', async function(callback) {
        if (!this.verifyDevice(callback)) {
          return;
        }

        this.getCharacteristicValue(cconfig.id, cconfigget).then(result=>{
          cconfigget.response_callback(this, result.value, callback);
        }).catch(err => {
          this.log.warn(`[${cconfig.id}]-[GET] Error:`, err);
          callback(err);
        });
      }.bind(this));
    }

    if ('set' in cconfig) {
      let cconfigset = cconfig.set;
      characteristic.on('set', async function(value, callback) {
        if (!this.verifyDevice(callback)) {
          return;
        }
        this.log.debug(
            `[${cconfig.id}]-[SET] Call device:`, cconfigset.call_name,
            cconfigset.call_args(
                this, value));
        this.device.call(cconfigset.call_name,
            cconfigset.call_args(this, value)).then(result => {
          this.log.debug(
              `[${cconfig.id}]-[SET] Response from device:`, result);
          cconfigset.response_callback(this, result, callback);
        }).catch(err => {
          this.log.warn(`[${cconfig.id}]-[SET] Error:`, err);
          callback(err);
        });
      }.bind(this));
    }
  }

  // private
  async getCharacteristicValueAttempt(cconfigid, cconfigget, resolve, reject, attemptNumber) {
    this.log.debug(`[${cconfigid}]-[GET] Call device:`, cconfigget.call_name, cconfigget.call_args(this));
    this.device.call(cconfigget.call_name, cconfigget.call_args(this))
    .then(value => resolve({ attempt: attemptNumber, value: value }))
    .catch(err => {
      if (attemptNumber === 1){
        reject(err);
        return;
      }
      if ((err.message === 'busy.') && (attemptNumber < repeatAttemptsCount + 1)) {
        this.sleep(repeatRequestTimeout)
        .then(() => this.getCharacteristicValueAttempt(cconfigid, cconfigget, resolve, reject, attemptNumber + 1));
        return;
      }
      reject(err);
    });
  }

  // private
  async getCharacteristicValue(cconfigid, cconfigget) {
    let isFirstCallDone = false;

    // "this.device.call" hangs after idle, so there is getCharacteristicDelayedPromise to be started with "idleRequestTimeout" delay
    const firstGetCharacteristicPromise = new Promise((resolve, reject) => {
      this.getCharacteristicValueAttempt(cconfigid, cconfigget, (result)=>{
        isFirstCallDone = true;
        resolve(result);
      }, reject, 1);
    });
    const getCharacteristicDelayedPromise = new Promise((resolve, reject) => {
      this.sleep(idleRequestTimeout)
      .then(() => {
        if (!isFirstCallDone) {
          this.getCharacteristicValueAttempt(cconfigid, cconfigget, resolve, reject, 2);
        }
      });
    });
    return await Promise.race([firstGetCharacteristicPromise, getCharacteristicDelayedPromise]);
  }

  // public
  getInfoService() {
    return this.infoService;
  }

  // public
  getHumidifierService() {
    return this.humidifierService;
  }

  // public
  getOptionalServices() {
    return this.optionalServices;
  }

  // private
  verifyDevice(callback) {
    if (!this.device) {
      callback(new Error('No humidifier is discovered'));
      return false;
    }
    return true;
  }

  // public
  async discover() {
    try {
      this.device = await miio.device({address: this.ip, token: this.token});
      this.log.debug(`Discovered model: ${this.device.miioModel}`);
      // let info = await this.device.call("miIO.info", []);
      // console.log(info);
      this.log.debug(`Discovered id: ${this.device.id}`);
    } catch (e) {
      this.log.warn('Fail to discover the device. Retry in 1 minute', e);
      setTimeout(() => { this.discover(); }, 60000);
    }
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

};
