import type * as hb from "homebridge";
import { PlatformAccessory, DeviceOptions } from "../../platform";
import { MiotHumidifier, MiotArg } from "../miot";
import { ValueOf } from "../utils";

enum Mode {
  Auto = 0,
  Low = 1,
  Medium = 2,
  High = 3,
}

enum LedState {
  Bright = 0,
  Dim = 1,
  Off = 2,
}

type Props = {
  power: boolean;
  mode: Mode;
  target_humidity: number;
  water_level: number;
  dry: boolean;
  humidity: number;
  child_lock: boolean;
  led_brightness: LedState;
  buzzer: boolean;
  temperature: number;
};

export class ZhimiHumidifierCA4 extends MiotHumidifier<Props> {
  protected callArgs(
    key: keyof Props,
    value: ValueOf<Props> | null,
  ): MiotArg<ValueOf<Props>> {
    const common = { did: key, value };

    switch (key) {
      case "power":
        return { ...common, siid: 2, piid: 1 };
      case "mode":
        return { ...common, siid: 2, piid: 5 };
      case "target_humidity":
        return { ...common, siid: 2, piid: 6 };
      case "water_level":
        return { ...common, siid: 2, piid: 7 };
      case "dry":
        return { ...common, siid: 2, piid: 8 };
      case "humidity":
        return { ...common, siid: 3, piid: 9 };
      case "child_lock":
        return { ...common, siid: 6, piid: 1 };
      case "led_brightness":
        return { ...common, siid: 5, piid: 1 };
      case "buzzer":
        return { ...common, siid: 4, piid: 1 };
      case "temperature":
        return { ...common, siid: 3, piid: 7 };
    }
  }

  public configureAccessory(
    accessory: PlatformAccessory,
    api: hb.API,
    options: DeviceOptions,
  ): void {
    super.configureAccessory(accessory, api, options);

    const { Service, Characteristic } = api.hap;

    //
    // Humidifier
    //

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.CurrentHumidifierDehumidifierState,
      props: {
        validValues: [
          Characteristic.CurrentHumidifierDehumidifierState.INACTIVE,
          Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING,
        ],
      },
      value: Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING,
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.TargetHumidifierDehumidifierState,
      props: {
        validValues: [
          Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER,
        ],
      },
      value: Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER,
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.Active,
      key: "power",
      get: {
        arg: (key) => this.callArgs(key, null),
        map: (it) =>
          it ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE,
      },
      set: {
        call: "set_properties",
        arg: this.callArgs,
        map: (it) => it === Characteristic.Active.ACTIVE,
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.RotationSpeed,
      props: {
        minValue: 0,
        maxValue: 3,
      },
      key: "mode",
      get: {
        arg: (key) => this.callArgs(key, null),
        map: (it) => {
          switch (it) {
            case Mode.Low:
              return 1;
            case Mode.Medium:
              return 2;
            case Mode.High:
              return 3;
            case Mode.Auto:
              return 4;
          }
        },
      },
      set: {
        call: "set_properties",
        arg: this.callArgs,
        map: (it) => {
          switch (it) {
            case 1:
              return Mode.Low;
            case 2:
              return Mode.Medium;
            case 3:
              return Mode.High;
            case 4:
              return Mode.Auto;
            default:
              return Mode.Low;
          }
        },
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.RelativeHumidityHumidifierThreshold,
      props: {
        minValue: 30,
        maxValue: 80,
      },
      key: "target_humidity",
      get: {
        arg: (key) => this.callArgs(key, null),
      },
      set: {
        call: "set_properties",
        arg: this.callArgs,
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.WaterLevel,
      key: "water_level",
      get: {
        arg: (key) => this.callArgs(key, null),
        map: (it) => it / 1.2,
      },
      set: {
        call: "set_properties",
        arg: this.callArgs,
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.SwingMode,
      key: "dry",
      get: {
        arg: (key) => this.callArgs(key, null),
        map: (it) =>
          it
            ? Characteristic.SwingMode.SWING_ENABLED
            : Characteristic.SwingMode.SWING_DISABLED,
      },
      set: {
        call: "set_properties",
        arg: this.callArgs,
        map: (it) => it === Characteristic.SwingMode.SWING_ENABLED,
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.CurrentRelativeHumidity,
      key: "humidity",
      get: {
        arg: (key) => this.callArgs(key, null),
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.LockPhysicalControls,
      key: "child_lock",
      get: {
        arg: (key) => this.callArgs(key, null),
        map: (it) =>
          it
            ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
            : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED,
      },
      set: {
        call: "set_properties",
        arg: this.callArgs,
        map: (it) =>
          it === Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED,
      },
    });

    //
    // Led bulb
    //

    if (options.ledBulb?.enabled) {
      if (options.ledBulb.name) {
        this.register(accessory, {
          service: Service.Lightbulb,
          characteristic: Characteristic.Name,
          value: options.ledBulb.name,
        });
      }

      this.register(accessory, {
        service: Service.Lightbulb,
        characteristic: Characteristic.Brightness,
        props: {
          minValue: 0,
          maxValue: 2,
        },
        key: "led_brightness",
        get: {
          arg: (key) => this.callArgs(key, null),
          map: (it) => {
            switch (it) {
              case LedState.Off:
                return 0;
              case LedState.Dim:
                return 1;
              case LedState.Bright:
                return 2;
              default:
                return 0;
            }
          },
        },
        set: {
          call: "set_properties",
          arg: this.callArgs,
          map: (it) => {
            switch (it) {
              case 0:
                return LedState.Off;
              case 1:
                return LedState.Dim;
              case 2:
                return LedState.Bright;
              default:
                return LedState.Off;
            }
          },
        },
      });

      this.register(accessory, {
        service: Service.Lightbulb,
        characteristic: Characteristic.On,
        key: "led_brightness",
        get: {
          arg: (key) => this.callArgs(key, null),
          map: (it) => (it !== LedState.Off ? true : false),
        },
        set: {
          call: "set_properties",
          arg: this.callArgs,
          map: (it) => (it ? LedState.Dim : LedState.Off),
          beforeSet: (value, characteristic) => {
            // HomeKit trying to set "On" to true after changing brightness
            // which cause switching brightness back to Dim.
            // So skip set if bulb has already turned on.
            return value === characteristic.value;
          },
        },
      });
    }

    //
    // Buzzer switch
    //

    if (options.buzzerSwitch?.enabled) {
      if (options.buzzerSwitch.name) {
        this.register(accessory, {
          service: Service.Switch,
          characteristic: Characteristic.Name,
          value: options.buzzerSwitch.name,
        });
      }

      this.register(accessory, {
        service: Service.Switch,
        characteristic: Characteristic.Active,
        key: "buzzer",
        get: {
          arg: (key) => this.callArgs(key, null),
          map: (it) =>
            it ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE,
        },
        set: {
          call: "set_properties",
          arg: this.callArgs,
          map: (it) => it === Characteristic.Active.ACTIVE,
        },
      });
    }

    //
    // Temperature sensor
    //

    if (options.temperatureSensor?.enabled) {
      if (options.temperatureSensor.name) {
        this.register(accessory, {
          service: Service.TemperatureSensor,
          characteristic: Characteristic.Name,
          value: options.temperatureSensor.name,
        });
      }

      this.register(accessory, {
        service: Service.TemperatureSensor,
        characteristic: Characteristic.CurrentTemperature,
        key: "temperature",
        get: {
          arg: (key) => this.callArgs(key, null),
        },
      });
    }
  }
}
