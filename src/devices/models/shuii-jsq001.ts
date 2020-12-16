import type * as hap from "hap-nodejs";
import * as miio from "miio-api";
import { MiioProtocol } from "../protocols";
import { DeviceOptions } from "../../platform";
import { ValueOf } from "../utils";
import { features } from "../features";
import { HumidifierConfig } from ".";

enum Mode {
  Off = -1,
  Level1 = 1,
  Level2 = 2,
  Level3 = 3,
  Level4 = 4,
  Level5 = 5,
  Intelligent = 0,
}

enum State {
  Off = 0,
  On = 1,
}

enum LedState {
  Off = 0,
  Dim = 1,
  Bright = 2,
}

enum WaterState {
  Enough = 0,
  AddWater = 1,
}

type Props = {
  temperature: number;
  humidity: number;
  mode: Mode;
  buzzer: State;
  child_lock: State;
  led_brightness: LedState;
  power: State;
  no_water: WaterState;
};

class Proto extends MiioProtocol<Props> {
  mapGetResults(results: Array<ValueOf<Props>>): Props {
    return {
      temperature: results[0],
      humidity: results[1],
      mode: results[2],
      buzzer: results[3],
      child_lock: results[4],
      led_brightness: results[5],
      power: results[6],
      no_water: results[7],
    };
  }

  prepareGetArgs(_props: Array<keyof Props>): string[] {
    return [];
  }
}

export function shuiiJSQ001(
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
      feat.active("power", "set_start", { on: State.On, off: State.Off }),
      feat.rotationSpeed("mode", "set_mode", {
        modes: [
          Mode.Off,
          Mode.Level1,
          Mode.Level2,
          Mode.Level3,
          Mode.Level4,
          Mode.Level5,
          Mode.Intelligent,
        ],
      }),
      feat.humidity("humidity"),
      feat.waterLevel("no_water", { toChar: (it) => it * 100 }),
      feat.lockPhysicalControls("child_lock", "set_lock", {
        on: State.On,
        off: State.Off,
      }),

      ...(options.ledBulb?.enabled
        ? feat.ledBulb("led_brightness", "set_brightness", {
            name: options.ledBulb.name,
            modes: [LedState.Off, LedState.Dim, LedState.Bright],
            on: LedState.Dim,
            off: LedState.Off,
          })
        : []),

      ...(options.buzzerSwitch?.enabled
        ? feat.buzzerSwitch("buzzer", "set_buzzer", {
            name: options.buzzerSwitch.name,
            on: State.On,
            off: State.Off,
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
