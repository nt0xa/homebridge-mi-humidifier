// MiHumidifierCA4
const MiHumidifierAdapter = require('./MiHumidifierAdapter');

module.exports = class extends MiHumidifierAdapter {

  constructor (log, options, api) {
    super(log, options, api);

    let Service = this.api.hap.Service;
    let Characteristic = this.api.hap.Characteristic;

    let characteristicsConfigs = [
      {
        id     : 'CurrentRelativeHumidity',
        service: this.humidifierService,
        type   : Characteristic.CurrentRelativeHumidity,
        props  : null,
        get    : {
          call_name        : 'get_properties',
          call_args        : function (_this) {
            return [{ did: _this.device.id, siid: 3, piid: 9, value: null }]
          },
          response_callback: function (_this, result, callback) {
            callback(null, result[0].value)
          },
        },
      },
      {
        id     : 'CurrentHumidifierDehumidifierState',
        service: this.humidifierService,
        type   : Characteristic.CurrentHumidifierDehumidifierState,
        props  : { validValues: [0, 2] },
        get    : {
          call_name        : 'get_properties',
          call_args        : function (_this) {
            return [{ did: _this.device.id, siid: 2, piid: 1, value: null }]
          },
          response_callback: function (_this, result, callback) {
            callback(null, result[0].value
              ? Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING
              : Characteristic.CurrentHumidifierDehumidifierState.INACTIVE)
          },
        },
      },
      {
        id     : 'Active',
        service: this.humidifierService,
        type   : Characteristic.Active,
        props  : null,
        get    : {
          call_name        : 'get_properties',
          call_args        : function (_this) {
            return [{ did: _this.device.id, siid: 2, piid: 1, value: null }]
          },
          response_callback: function (_this, result, callback) {
            callback(null, result[0].value
              ? Characteristic.Active.ACTIVE
              : Characteristic.Active.INACTIVE)
          },
        },
        set    : {
          call_name        : 'set_properties',
          call_args        : function (_this, value) {
            return [
              {
                did  : _this.device.id,
                siid : 2,
                piid : 1,
                value: Characteristic.Active.ACTIVE === value,
              }]
          },
          response_callback: function (_this, result, callback) {
            if (result[0].code === 0) {
              callback(null)
            } else {
              callback(new Error(result[0]))
            }
          },
        },
      },
      {
        id     : 'LockPhysicalControls',
        service: this.humidifierService,
        type   : Characteristic.LockPhysicalControls,
        props  : null,
        get    : {
          call_name        : 'get_properties',
          call_args        : function (_this) {
            return [{ did: _this.device.id, siid: 6, piid: 1, value: null }]
          },
          response_callback: function (_this, result, callback) {
            callback(null, result[0].value
              ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
              : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED)
          },
        },
        set    : {
          call_name        : 'set_properties',
          call_args        : function (_this, value) {
            return [
              {
                did  : _this.device.id,
                siid : 6,
                piid : 1,
                value: value ===
                  Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED,
              }]
          },
          response_callback: function (_this, result, callback) {
            if (result[0].code === 0) {
              callback(null)
            } else {
              callback(new Error(result[0]))
            }
          },
        },
      },
      {
        id     : 'SwingMode', // dry mode
        service: this.humidifierService,
        type   : Characteristic.SwingMode,
        props  : null,
        get    : {
          call_name        : 'get_properties',
          call_args        : function (_this) {
            return [{ did: _this.device.id, siid: 2, piid: 8, value: null }]
          },
          response_callback: function (_this, result, callback) {
            callback(null, result[0].value
              ? Characteristic.SwingMode.SWING_ENABLED
              : Characteristic.SwingMode.SWING_DISABLED)
          },
        },
        set    : {
          call_name        : 'set_properties',
          call_args        : function (_this, value) {
            return [
              {
                did  : _this.device.id,
                siid : 2,
                piid : 8,
                value: value === Characteristic.SwingMode.SWING_ENABLED,
              }]
          },
          response_callback: function (_this, result, callback) {
            if (result[0].code === 0) {
              callback(null)
            } else {
              callback(new Error(result[0]))
            }
          },
        },
      },
      {
        id     : 'WaterLevel',
        service: this.humidifierService,
        type   : Characteristic.WaterLevel,
        props  : null,
        get    : {
          call_name        : 'get_properties',
          call_args        : function (_this) {
            return [{ did: _this.device.id, siid: 2, piid: 7, value: null }]
          },
          response_callback: function (_this, result, callback) {
            callback(null, (result[0].value || 0) / 1.28)
          },
        },
      },
      {
        id     : 'RelativeHumidityHumidifierThreshold',
        service: this.humidifierService,
        type   : Characteristic.RelativeHumidityHumidifierThreshold,
        props  : {
          minValue: 0,
          maxValue: 100,
          minStep : 1,
        },
        get    : {
          call_name        : 'get_properties',
          call_args        : function (_this) {
            return [{ did: _this.device.id, siid: 2, piid: 6, value: null }]
          },
          response_callback: function (_this, result, callback) {
            callback(null, result[0].value)
          },
        },
        set    : {
          call_name        : 'set_properties',
          call_args        : function (_this, value) {
            value = Math.max(value, 30)
            value = Math.min(value, 80)
            return [{ did: _this.device.id, siid: 2, piid: 6, value: value }]
          },
          response_callback: function (_this, result, callback) {
            if (result[0].code === 0) {
              callback(null)
            } else {
              callback(new Error(result[0]))
            }
          },
        },
      },
      {
        id     : 'RotationSpeed',
        service: this.humidifierService,
        type   : Characteristic.RotationSpeed,
        props  : {
          minValue: 0,
          maxValue: 3,
          minStep : 1,
        },
        get    : {
          call_name        : 'get_properties',
          call_args        : function (_this) {
            return [{ did: _this.device.id, siid: 2, piid: 5, value: null }]
          },
          response_callback: function (_this, result, callback) {
            callback(null, result[0].value)
          },
        },
        set    : {
          call_name        : 'set_properties',
          call_args        : function (_this, value) {
            return [{ did: _this.device.id, siid: 2, piid: 5, value: value }]
          },
          response_callback: function (_this, result, callback) {
            if (result[0].code === 0) {
              callback(null)
            } else {
              callback(new Error(result[0]))
            }
          },
        },
      },
    ];

    // DisplayService
    this.displayService = new Service.Lightbulb('Screen');
    this.optionalServices.push(this.displayService);
    characteristicsConfigs = characteristicsConfigs.concat([
      {
        id     : 'DS.Brightness',
        service: this.displayService,
        type   : Characteristic.Brightness,
        props  : {
          minValue: 0,
          maxValue: 2,
          minStep : 1,
        },
        get    : {
          call_name        : 'get_properties',
          call_args        : function (_this) {
            return [{ did: _this.device.id, siid: 5, piid: 2, value: null }]
          },
          response_callback: function (_this, result, callback) {
            callback(null, result[0].value)
          },
        },
        set    : {
          call_name        : 'set_properties',
          call_args        : function (_this, value) {
            return [{ did: _this.device.id, siid: 5, piid: 2, value: value }]
          },
          response_callback: function (_this, result, callback) {
            if (result[0].code === 0) {
              callback(null)
            } else {
              callback(new Error(result[0]))
            }
          },
        },
      },
    ]);

    // HumiditySensorService
    if (options.showHumidity) {
      this.humiditySensorService = new Service.HumiditySensor(
        options.nameHumidity);
      this.optionalServices.push(this.humiditySensorService);
      characteristicsConfigs = characteristicsConfigs.concat([
        {
          id     : 'HSS.CurrentRelativeHumidity',
          service: this.humiditySensorService,
          type   : Characteristic.CurrentRelativeHumidity,
          props  : null,
          get    : {
            call_name        : 'get_properties',
            call_args        : function (_this) {
              return [{ did: _this.device.id, siid: 3, piid: 9, value: null }]
            },
            response_callback: function (_this, result, callback) {
              callback(null, result[0].value)
            },
          },
        },
      ])
    }

    // TemperatureSensorService
    if (options.showTemperature) {
      this.temperatureSensorService = new Service.TemperatureSensor(
        options.nameTemperature);
      this.optionalServices.push(this.temperatureSensorService);
      characteristicsConfigs = characteristicsConfigs.concat([
        {
          id     : 'TSS.CurrentTemperature',
          service: this.temperatureSensorService,
          type   : Characteristic.CurrentTemperature,
          props  : null,
          get    : {
            call_name        : 'get_properties',
            call_args        : function (_this) {
              return [{ did: _this.device.id, siid: 3, piid: 7, value: null }]
            },
            response_callback: function (_this, result, callback) {
              callback(null, result[0].value)
            },
          },
        },
      ])
    }

    // SpeakerService
    if (options.showMuteSwitch) {
      this.speakerService = new Service.Switch(options.nameMuteSwitch);
      this.optionalServices.push(this.speakerService);
      characteristicsConfigs = characteristicsConfigs.concat([
        {
          id     : 'SS.On',
          service: this.speakerService,
          type   : Characteristic.On,
          props  : null,
          get    : {
            call_name        : 'get_properties',
            call_args        : function (_this) {
              return [{ did: _this.device.id, siid: 4, piid: 1, value: null }]
            },
            response_callback: function (_this, result, callback) {
              callback(null, !result[0].value)
            },
          },
          set    : {
            call_name        : 'set_properties',
            call_args        : function (_this, value) {
              return [
                {
                  did  : _this.device.id,
                  siid : 4,
                  piid : 1,
                  value: !value,
                }]
            },
            response_callback: function (_this, result, callback) {
              if (result[0].code === 0) {
                callback(null)
              } else {
                callback(new Error(result[0]))
              }
            },
          },
        },
      ])
    }

    for (let cconfig in characteristicsConfigs) {
      this.registerCharacteristic(characteristicsConfigs[cconfig]);
    }

  }

};
