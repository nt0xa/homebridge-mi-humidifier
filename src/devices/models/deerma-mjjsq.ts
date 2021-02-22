import type * as hb from "homebridge";
import * as miio from "miio-api";
import { MiioProtocol } from "../protocols";
import { DeviceOptions } from "../../platform";
import { Features } from "../features";
import { HumidifierConfig } from ".";

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

class Proto extends MiioProtocol<Props> {
  maxGetPropsNumber() {
    return 1;
  }
}

export function deermaMJJSQ(
  device: miio.Device,
  feat: Features<Props>,
  log: hb.Logging,
  options: DeviceOptions,
): HumidifierConfig<Props> {
  return {
    protocol: new Proto(device),
    features: [
      feat.targetState(),
      feat.currentState("OnOff_State", {
        on: State.On,
        off: State.Off,
      }),
      feat.active("OnOff_State", "Set_OnOff", {
        on: State.On,
        off: State.Off,
      }),
      feat.rotationSpeed("Humidifier_Gear", "Set_HumidifierGears", {
        modes: [Gear.Low, Gear.Medium, Gear.High, Gear.Humidity],
      }),
      feat.humidity("Humidity_Value"),
      feat.humidityThreshold("HumiSet_Value", "Set_HumiValue", {
        min: 40,
        max: 70,
        switchToMode: options.autoSwitchToHumidityMode
          ? {
              key: "Humidifier_Gear",
              call: "Set_HumidifierGears",
              value: Gear.Humidity,
            }
          : undefined,
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
