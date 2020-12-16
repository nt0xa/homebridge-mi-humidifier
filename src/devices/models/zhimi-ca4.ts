import type * as hap from "hap-nodejs";
import * as miio from "miio-api";
import { MiotProtocol, MiotArg } from "../protocols";
import { DeviceOptions } from "../../platform";
import { ValueOf } from "../utils";
import { features } from "../features";
import { HumidifierConfig } from ".";

enum Mode {
  Off = -1, // dummy
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

class Proto extends MiotProtocol<Props> {
  protected getCallArg(key: keyof Props): MiotArg {
    return this.callArgs(key, null);
  }

  protected setCallArg(key: keyof Props, value: ValueOf<Props>): MiotArg {
    return this.callArgs(key, value);
  }

  private callArgs(key: keyof Props, value: ValueOf<Props> | null): MiotArg {
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
}

export function zhimiCA4(
  device: miio.Device,
  Service: typeof hap.Service,
  Characteristic: typeof hap.Characteristic,
  options: DeviceOptions,
): HumidifierConfig<Props> {
  const feat = features<Props>(Service, Characteristic);

  return {
    protocol: new Proto(device),
    features: [
      feat.currentState(),
      feat.targetState(),
      feat.active("power", "set_properties", { on: true, off: false }),
      feat.rotationSpeed("mode", "set_properties", {
        modes: [Mode.Off, Mode.Low, Mode.Medium, Mode.High, Mode.Auto],
      }),
      feat.humidityThreshold("target_humidity", "set_properties"),
      feat.waterLevel("water_level", {
        toChar: (it) => it / 1.2,
      }),
      feat.swingMode("dry", "set_properties", { on: true, off: false }),
      feat.humidity("humidity"),
      feat.lockPhysicalControls("child_lock", "set_properties", {
        on: true,
        off: false,
      }),

      ...(options.ledBulb?.enabled
        ? feat.ledBulb("led_brightness", "set_properties", {
            name: options.ledBulb.name,
            modes: [LedState.Off, LedState.Dim, LedState.Bright],
            on: LedState.Dim,
            off: LedState.Off,
          })
        : []),

      ...(options.buzzerSwitch?.enabled
        ? feat.buzzerSwitch("buzzer", "set_properties", {
            name: options.buzzerSwitch.name,
            on: true,
            off: false,
          })
        : []),

      ...(options.humiditySensor?.enabled
        ? feat.humiditySensor("humidity", {
            name: options.humiditySensor.name,
          })
        : []),

      ...(options.temperatureSensor?.enabled
        ? feat.temperatureSensor("temperature", {
            name: options.temperatureSensor.name,
            toChar: (it) => it,
          })
        : []),
    ],
  };
}
