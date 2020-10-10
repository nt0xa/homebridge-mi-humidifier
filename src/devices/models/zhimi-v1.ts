import type * as hb from "homebridge";
import { PlatformAccessory, DeviceOptions } from "../../platform";
import { CommonProps, ZhimiCommon } from "./zhimi-common";

enum Mode {
  Silent = "silent",
  Medium = "medium",
  High = "high",
}

type Props = CommonProps & {
  mode: Mode;
  temp_dec: number;
};

export class ZhimiHumidifierV1 extends ZhimiCommon<Props> {
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
      characteristic: Characteristic.RotationSpeed,
      props: {
        minValue: 0,
        maxValue: 3,
      },
      key: "mode",
      get: {
        map: (it) => {
          switch (it) {
            case Mode.Silent:
              return 1;
            case Mode.Medium:
              return 2;
            case Mode.High:
              return 3;
            default:
              return 0;
          }
        },
      },
      set: {
        call: "set_mode",
        map: (it) => {
          switch (it) {
            case 1:
              return Mode.Silent;
            case 2:
              return Mode.Medium;
            case 3:
              return Mode.High;
            default:
              return Mode.Silent;
          }
        },
      },
    });

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
        key: "temp_dec",
        get: {
          map: (it) => it / 10,
        },
      });
    }
  }
}
