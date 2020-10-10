import type * as hb from "homebridge";
import { MiioHumidifier } from "../miio";
import { PlatformAccessory, DeviceOptions } from "../../platform";

enum Gear {
  Low = 1,
  Medium = 2,
  High = 3,
  Humidity = 4,
}

enum State {
  Off = 0,
  On = 1,
}

type Props = {
  OnOff_State: State;
  TemperatureValue: number;
  Humidity_Value: number;
  HumiSet_Value: number;
  Humidifier_Gear: Gear;
  Led_State: State;
  TipSound_State: State;
  waterstatus: State;
  watertankstatus: State;
};

export class DeermaHumidifierMJJSQ extends MiioHumidifier<Props> {
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
      key: "OnOff_State",
      set: {
        call: "Set_OnOff",
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.Active,
      props: {
        minValue: 0,
        maxValue: 4,
      },
      key: "Humidifier_Gear",
      get: {
        map: (it) => {
          switch (it) {
            case Gear.Low:
              return 1;
            case Gear.Medium:
              return 2;
            case Gear.High:
              return 3;
            case Gear.Humidity:
              return 4;
            default:
              return 0;
          }
        },
      },
      set: {
        call: "Set_HumidifierGears",
        map: (it) => {
          switch (it) {
            case 1:
              return Gear.Low;
            case 2:
              return Gear.Medium;
            case 3:
              return Gear.High;
            case 4:
              return Gear.Humidity;
            default:
              return Gear.Low;
          }
        },
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.CurrentRelativeHumidity,
      key: "Humidity_Value",
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.RelativeHumidityHumidifierThreshold,
      props: {
        minValue: 30,
        maxValue: 80,
      },
      key: "HumiSet_Value",
      set: {
        call: "Set_HumiValue",
        beforeSet: async (_value, _characteristic, callback) => {
          // There is special mode for humidity threshold - Gear.Humidity,
          // so set mode to Gear.Humidity.
          try {
            const [result] = await this.device.call("Set_HumiValue", [
              Gear.Humidity,
            ]);

            if (result !== "ok") {
              throw new Error(`Fail to set "Set_HumiValue"`);
            }
          } catch (err) {
            callback(err);
            return true;
          }

          return false;
        },
      },
    });

    this.register(accessory, {
      service: Service.HumidifierDehumidifier,
      characteristic: Characteristic.WaterLevel,
      key: "waterstatus",
      get: {
        map: (it) => it * 100,
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
        key: "TemperatureValue",
      });
    }

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
        characteristic: Characteristic.On,
        key: "Led_State",
        get: {
          map: (it) => it === State.On,
        },
        set: {
          call: "SetLedState",
          map: (it) => (it ? State.On : State.Off),
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
        key: "TipSound_State",
        get: {
          map: (it) =>
            it === State.On
              ? Characteristic.Active.ACTIVE
              : Characteristic.Active.INACTIVE,
        },
        set: {
          call: "SetTipSound_Status",
          map: (it) =>
            it === Characteristic.Active.ACTIVE ? State.On : State.Off,
        },
      });
    }
  }
}
