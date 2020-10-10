import type * as hb from "homebridge";
import { PlatformAccessory, DeviceOptions } from "../../platform";
import { HumidifierModel } from "../factory";
import { CommonProps, ZhimiCommon } from "./zhimi-common";

enum Mode {
  Auto = "auto",
  Silent = "silent",
  Medium = "medium",
  High = "high",
}

type Props = CommonProps & {
  mode: Mode;
  depth: number;
  dry: "on" | "off";
  temperature: number; // cb1
  temp_dec: number; // ca1
};

export class ZhimiHumidifierCAB1 extends ZhimiCommon<Props> {
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
        maxValue: 4,
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
            case Mode.Auto:
              return 4;
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
            case 4:
              return Mode.Auto;
            default:
              return Mode.Silent;
          }
        },
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.WaterLevel,
      key: "depth",
      get: {
        map: (it) => it / 1.2,
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.SwingMode,
      key: "dry",
      get: {
        map: (it) =>
          it === "on"
            ? Characteristic.SwingMode.SWING_ENABLED
            : Characteristic.SwingMode.SWING_DISABLED,
      },
      set: {
        call: "set_dry",
        map: (it) =>
          it === Characteristic.SwingMode.SWING_ENABLED ? "on" : "off",
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
        key:
          this.deviceModel === HumidifierModel.ZHIMI_CA1
            ? "temp_dec"
            : "temperature",
        get: {
          map: (it) => it / 10,
        },
      });
    }
  }
}
