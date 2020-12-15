import type * as hb from "homebridge";
import type * as hap from "hap-nodejs";
import { BasePropsType, BaseHumidifier } from "./humidifier";
import { PlatformAccessory } from "../platform";

export class FeaturesHelper<PropsType extends BasePropsType> {
  humidifier: BaseHumidifier<PropsType>;
  accessory: PlatformAccessory;
  Service: typeof hap.Service;
  Characteristic: typeof hap.Characteristic;

  constructor(
    humidifier: BaseHumidifier<PropsType>,
    accessory: PlatformAccessory,
    Service: typeof hap.Service,
    Characteristic: typeof hap.Characteristic,
  ) {
    this.humidifier = humidifier;
    this.accessory = accessory;
    this.Service = Service;
    this.Characteristic = Characteristic;
  }

  currentState(): void {
    this.humidifier.register(this.accessory, {
      service: this.Service.HumidifierDehumidifier,
      characteristic: this.Characteristic.CurrentHumidifierDehumidifierState,
      props: {
        validValues: [
          this.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE,
          this.Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING,
        ],
      },
      value: this.Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING,
    });
  }

  targetState(): void {
    this.humidifier.register(this.accessory, {
      service: this.Service.HumidifierDehumidifier,
      characteristic: this.Characteristic.TargetHumidifierDehumidifierState,
      props: {
        validValues: [
          this.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER,
        ],
      },
      value: this.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER,
    });
  }

  active<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): void {
    this.humidifier.register(this.accessory, {
      service: this.Service.HumidifierDehumidifier,
      characteristic: this.Characteristic.Active,
      key: key,
      get: {
        map: (it) =>
          it === params.on
            ? this.Characteristic.Active.ACTIVE
            : this.Characteristic.Active.INACTIVE,
      },
      set: {
        call: setCall,
        map: (it) =>
          it === this.Characteristic.Active.ACTIVE ? params.on : params.off,
      },
    });
  }

  rotationSpeed<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      modes: Array<PropsType[PropKey]>;
    },
  ): void {
    this.humidifier.register(this.accessory, {
      service: this.Service.HumidifierDehumidifier,
      characteristic: this.Characteristic.RotationSpeed,
      props: {
        minValue: 0,
        maxValue: params.modes.length - 1,
      },
      key: key,
      get: {
        map: (it) => {
          const index = params.modes.findIndex((mode) => mode === it);
          return index > 0 ? index : 0;
        },
      },
      set: {
        call: setCall,
        map: (it) =>
          it >= 0 && it < params.modes.length
            ? params.modes[it as number]
            : params.modes[0],
      },
    });
  }

  humidity<PropKey extends keyof PropsType>(key: PropKey): void {
    this.humidifier.register(this.accessory, {
      service: this.Service.HumidifierDehumidifier,
      characteristic: this.Characteristic.CurrentRelativeHumidity,
      key: key,
      get: {
        map: (it) => it,
      },
    });
  }

  humidityThreshold<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      beforeSet?: (
        value: PropsType[PropKey],
        characteristic: hb.Characteristic,
        callback: hb.CharacteristicSetCallback,
      ) => boolean | Promise<boolean>;
    } = {},
  ): void {
    this.humidifier.register(this.accessory, {
      service: this.Service.HumidifierDehumidifier,
      characteristic: this.Characteristic.RelativeHumidityHumidifierThreshold,
      props: {
        minValue: 30,
        maxValue: 80,
      },
      key: key,
      get: {
        map: (it) => it,
      },
      set: {
        call: setCall,
        map: (it) => it as PropsType[typeof key],
        beforeSet: params.beforeSet,
      },
    });
  }

  lockPhysicalControls<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): void {
    this.humidifier.register(this.accessory, {
      service: this.Service.HumidifierDehumidifier,
      characteristic: this.Characteristic.LockPhysicalControls,
      key: key,
      get: {
        map: (it) =>
          it === params.on
            ? this.Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
            : this.Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED,
      },
      set: {
        call: setCall,
        map: (it) =>
          it === this.Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
            ? params.on
            : params.off,
      },
    });
  }

  waterLevel<PropKey extends keyof PropsType>(
    key: PropKey,
    params: {
      toChar: (it: PropsType[PropKey]) => hb.CharacteristicValue;
    },
  ): void {
    this.humidifier.register(this.accessory, {
      service: this.Service.HumidifierDehumidifier,
      characteristic: this.Characteristic.WaterLevel,
      key: key,
      get: {
        map: params.toChar,
      },
    });
  }

  swingMode<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): void {
    this.humidifier.register(this.accessory, {
      service: this.Service.HumidifierDehumidifier,
      characteristic: this.Characteristic.SwingMode,
      key: key,
      get: {
        map: (it) =>
          it === params.on
            ? this.Characteristic.SwingMode.SWING_ENABLED
            : this.Characteristic.SwingMode.SWING_DISABLED,
      },
      set: {
        call: setCall,
        map: (it) =>
          it === this.Characteristic.SwingMode.SWING_ENABLED
            ? params.on
            : params.off,
      },
    });
  }

  ledBulb<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      name?: string;
      modes: Array<PropsType[PropKey]>;
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): void {
    if (params.name) {
      this.humidifier.register(this.accessory, {
        service: this.Service.Lightbulb,
        characteristic: this.Characteristic.Name,
        value: params.name,
      });
    }

    if (params.modes.length > 2) {
      this.humidifier.register(this.accessory, {
        service: this.Service.Lightbulb,
        characteristic: this.Characteristic.Brightness,
        props: {
          minValue: 0,
          maxValue: params.modes.length - 1,
        },
        key: key,
        get: {
          map: (it) => {
            const index = params.modes.findIndex((mode) => mode === it);
            return index > 0 ? index : 0;
          },
        },
        set: {
          call: setCall,
          map: (it) =>
            it >= 0 && it < params.modes.length
              ? params.modes[it as number]
              : params.modes[0],
        },
      });
    }

    this.humidifier.register(this.accessory, {
      service: this.Service.Lightbulb,
      characteristic: this.Characteristic.On,
      key: key,
      get: {
        map: (it) => (it !== params.off ? true : false),
      },
      set: {
        call: setCall,
        map: (it) => (it ? params.on : params.off),
        beforeSet: (value, characteristic) => {
          // HomeKit trying to set "On" to true after changing brightness
          // which cause switching brightness back to Dim.
          // So skip set if bulb has already turned on.
          return value === characteristic.value;
        },
      },
    });
  }

  buzzerSwitch<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      name?: string;
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): void {
    if (params.name) {
      this.humidifier.register(this.accessory, {
        service: this.Service.Switch,
        characteristic: this.Characteristic.Name,
        value: params.name,
      });
    }

    this.humidifier.register(this.accessory, {
      service: this.Service.Switch,
      characteristic: this.Characteristic.Active,
      key: key,
      get: {
        map: (it) =>
          it === params.on
            ? this.Characteristic.Active.ACTIVE
            : this.Characteristic.Active.INACTIVE,
      },
      set: {
        call: setCall,
        map: (it) =>
          it === this.Characteristic.Active.ACTIVE ? params.on : params.off,
      },
    });
  }

  humiditySensor<PropKey extends keyof PropsType>(
    key: PropKey,
    params: {
      name?: string;
    },
  ): void {
    if (params.name) {
      this.humidifier.register(this.accessory, {
        service: this.Service.HumiditySensor,
        characteristic: this.Characteristic.Name,
        value: params.name,
      });
    }

    this.humidifier.register(this.accessory, {
      service: this.Service.HumiditySensor,
      characteristic: this.Characteristic.CurrentRelativeHumidity,
      key: key,
    });
  }

  temperatureSensor<PropKey extends keyof PropsType>(
    key: PropKey,
    params: {
      name?: string;
      toChar?: (it: PropsType[PropKey]) => hb.CharacteristicValue;
    },
  ): void {
    if (params.name) {
      this.humidifier.register(this.accessory, {
        service: this.Service.TemperatureSensor,
        characteristic: this.Characteristic.Name,
        value: params.name,
      });
    }

    this.humidifier.register(this.accessory, {
      service: this.Service.TemperatureSensor,
      characteristic: this.Characteristic.CurrentTemperature,
      key: key,
      get: {
        map: params.toChar,
      },
    });
  }
}
