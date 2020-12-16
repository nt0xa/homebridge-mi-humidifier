import type * as hap from "hap-nodejs";
import * as miio from "miio-api";
import { MiioProtocol } from "../protocols";
import { DeviceOptions } from "../../platform";
import { features } from "../features";
import { HumidifierConfig } from ".";

enum Gear {
  Off = -1,
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

export function deermaMJJSQ(
  device: miio.Device,
  Service: typeof hap.Service,
  Characteristic: typeof hap.Characteristic,
  options: DeviceOptions,
): HumidifierConfig<Props> {
  const feat = features<Props>(Service, Characteristic);

  return {
    protocol: new MiioProtocol<Props>(device),
    features: [
      feat.currentState(),
      feat.targetState(),
      feat.active("OnOff_State", "Set_OnOff", {
        on: State.On,
        off: State.Off,
      }),
      feat.rotationSpeed("Humidifier_Gear", "Set_HumidifierGears", {
        modes: [Gear.Off, Gear.Low, Gear.Medium, Gear.High, Gear.Humidity],
      }),
      feat.humidity("Humidity_Value"),
      feat.humidityThreshold("HumiSet_Value", "Set_HumiValue", {
        beforeSet: async (_value, _characteristic, callback, protocol) => {
          // There is special mode for humidity threshold - Gear.Humidity,
          // so set mode to Gear.Humidity.
          try {
            await protocol.setProp(
              "HumiSet_Value",
              "Set_HumiValue",
              Gear.Humidity,
            );
          } catch (err) {
            callback(err);
            return true;
          }

          return false;
        },
      }),
      feat.waterLevel("waterstatus", { toChar: (it) => it * 100 }),

      ...(options.ledBulb?.enabled
        ? feat.ledBulb("Led_State", "SetLedState", {
            name: options.ledBulb.name,
            modes: [State.Off, State.On],
            off: State.Off,
            on: State.On,
          })
        : []),

      ...(options.buzzerSwitch?.enabled
        ? feat.buzzerSwitch("TipSound_State", "SetTipSound_Status", {
            name: options.buzzerSwitch.name,
            on: State.On,
            off: State.Off,
          })
        : []),

      ...(options.humiditySensor?.enabled
        ? feat.humiditySensor("Humidity_Value", {
            name: options.humiditySensor.name,
          })
        : []),

      ...(options.temperatureSensor?.enabled
        ? feat.temperatureSensor("TemperatureValue", {
            name: options.temperatureSensor.name,
            toChar: (it) => it,
          })
        : []),
    ],
  };
}
