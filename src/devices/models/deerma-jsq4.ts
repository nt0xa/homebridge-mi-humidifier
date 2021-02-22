import type * as hb from "homebridge";
import * as miio from "miio-api";
import { MiotProtocol, MiotArg } from "../protocols";
import { DeviceOptions } from "../../platform";
import { ValueOf } from "../utils";
import { Features } from "../features";
import { HumidifierConfig } from ".";

enum Mode {
  Level1 = 1,
  Level2 = 2,
  Humidity = 3
}

type Props = {
  power: boolean;
  fan_level: Mode;
  target_humidity: number;
  water_level: number;
  relative_humidity: number;
  switch_status: boolean;
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
      case "fan_level":
        return { ...common, siid: 2, piid: 5 };
      case "target_humidity":
        return { ...common, siid: 2, piid: 6 };
      case "water_level":
        return { ...common, siid: 7, piid: 1 };
      case "relative_humidity":
        return { ...common, siid: 3, piid: 1 };
      case "switch_status":
        return { ...common, siid: 6, piid: 1 };
      case "buzzer":
        return { ...common, siid: 5, piid: 1 };
      case "temperature":
        return { ...common, siid: 3, piid: 7 };
    }
  }
}

export function deermaJSQ4(
  device: miio.Device,
  feat: Features<Props>,
  log: hb.Logging,
  options: DeviceOptions,
): HumidifierConfig<Props> {
  return {
    protocol: new Proto(device),
    features: [
      feat.targetState(),
      feat.currentState("power", { on: true, off: false }),
      feat.active("power", "set_properties", { on: true, off: false }),
      feat.rotationSpeed("fan_level", "set_properties", {
        modes: [Mode.Level1, Mode.Level2, Mode.Humidity],
      }),
      feat.humidityThreshold("target_humidity", "set_properties", {
        min: 40,
        max: 70,
        switchToMode: options.autoSwitchToHumidityMode ? {
          key: "fan_level",
          call: "set_properties",
          value: Mode.Humidity,
        } : undefined,
      }),
      feat.waterLevel("water_level", {
        toChar: (it) => it == 0 ? 80 : 0,
      }),
      feat.humidity("relative_humidity"),
      ...(options.ledBulb?.enabled
        ? feat.ledBulb("switch_status", "set_properties", {
            name: options.ledBulb.name,
            modes: [true, false],
            on: true,
            off: false,
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
        ? feat.humiditySensor("relative_humidity", {
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
