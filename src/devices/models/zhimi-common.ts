import type * as hb from "homebridge";
import { MiioHumidifier } from "../miio";
import { PlatformAccessory, DeviceOptions } from "../../platform";

enum LedState {
  Bright = 0,
  Dim = 1,
  Off = 2,
}

export type CommonProps = {
  power: "on" | "off";
  humidity: number;
  limit_hum: number; // 30-80
  child_lock: "on" | "off";
  led_b: LedState;
  buzzer: "on" | "off";
};

export abstract class ZhimiCommon<
  PropsType extends CommonProps
> extends MiioHumidifier<PropsType> {
  configureAccessory(
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
        map: (it) =>
          it === "on"
            ? Characteristic.Active.ACTIVE
            : Characteristic.Active.INACTIVE,
      },
      set: {
        call: "set_power",
        map: (it) => (it === Characteristic.Active.ACTIVE ? "on" : "off"),
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.CurrentRelativeHumidity,
      key: "humidity",
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.RelativeHumidityHumidifierThreshold,
      props: {
        minValue: 30,
        maxValue: 80,
      },
      key: "limit_hum",
      set: {
        call: "set_limit_hum",
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.LockPhysicalControls,
      key: "child_lock",
      get: {
        map: (it) =>
          it === "on"
            ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
            : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED,
      },
      set: {
        call: "set_child_lock",
        map: (it) =>
          it === Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
            ? "on"
            : "off",
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
        key: "led_b",
        get: {
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
          call: "set_led_b",
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
        key: "led_b",
        get: {
          map: (it) => (it !== LedState.Off ? true : false),
        },
        set: {
          call: "set_led_b",
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
          map: (it) =>
            it === "on"
              ? Characteristic.Active.ACTIVE
              : Characteristic.Active.INACTIVE,
        },
        set: {
          call: "set_buzzer",
          map: (it) => (it === Characteristic.Active.ACTIVE ? "on" : "off"),
        },
      });
    }

    //
    // Humidity sensor
    //

    if (options.humiditySensor?.enabled) {
      if (options.humiditySensor.name) {
        this.register(accessory, {
          service: Service.HumiditySensor,
          characteristic: Characteristic.Name,
          value: options.humiditySensor.name,
        });
      }

      this.register(accessory, {
        service: Service.HumiditySensor,
        characteristic: Characteristic.CurrentRelativeHumidity,
        key: "humidity",
      });
    }
  }
}
