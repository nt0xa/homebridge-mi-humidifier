import type * as hb from "homebridge";
import type * as hap from "hap-nodejs";
import { BasePropsType, CharacteristicConfig, GetMapFunc } from "./humidifier";
import { ValueOf } from "./utils";
import { HumidifierModel } from "./models";

export type AnyCharacteristicConfig<PropsType> = CharacteristicConfig<
  PropsType,
  keyof PropsType,
  ValueOf<PropsType>
>;

export interface Features<PropsType extends BasePropsType> {
  accessoryInfo(
    name: string,
    model: HumidifierModel,
    deviceId: number,
  ): Array<AnyCharacteristicConfig<PropsType>>;

  currentState<PropKey extends keyof PropsType>(
    key: PropKey,
    params: {
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): AnyCharacteristicConfig<PropsType>;

  targetState(): AnyCharacteristicConfig<PropsType>;

  active<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): AnyCharacteristicConfig<PropsType>;

  rotationSpeed<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      modes: Array<PropsType[PropKey]>;
    },
  ): AnyCharacteristicConfig<PropsType>;

  humidity<PropKey extends keyof PropsType>(
    key: PropKey,
  ): AnyCharacteristicConfig<PropsType>;

  humidityThreshold<
    PropKey extends keyof PropsType,
    ModePropKey extends keyof PropsType
  >(
    key: PropKey,
    setCall: string,
    params: {
      min: number;
      max: number;
      // Some humidifiers have special mode for reaching target humidity.
      // Pass "key" and "value" for this mode to enable it automatically.
      switchToMode?: {
        key: ModePropKey;
        call: string;
        value: PropsType[ModePropKey];
      };
    },
  ): AnyCharacteristicConfig<PropsType>;

  lockPhysicalControls<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): AnyCharacteristicConfig<PropsType>;

  waterLevel<PropKey extends keyof PropsType>(
    key: PropKey,
    params: {
      toChar: (it: PropsType[PropKey]) => hb.CharacteristicValue;
    },
  ): AnyCharacteristicConfig<PropsType>;

  swingMode<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): AnyCharacteristicConfig<PropsType>;

  ledBulb<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      name?: string;
      modes: Array<PropsType[PropKey]>;
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): Array<AnyCharacteristicConfig<PropsType>>;

  buzzerSwitch<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      name?: string;
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): Array<AnyCharacteristicConfig<PropsType>>;

  humiditySensor<PropKey extends keyof PropsType>(
    key: PropKey,
    params: {
      name?: string;
    },
  ): Array<AnyCharacteristicConfig<PropsType>>;

  temperatureSensor<PropKey extends keyof PropsType>(
    key: PropKey,
    params: {
      name?: string;
      toChar?: (it: PropsType[PropKey]) => hb.CharacteristicValue;
    },
  ): Array<AnyCharacteristicConfig<PropsType>>;

  cleanModeSwitch<PropKey extends keyof PropsType>(
    key: PropKey,
    setCall: string,
    params: {
      name?: string;
      on: PropsType[PropKey];
      off: PropsType[PropKey];
    },
  ): Array<AnyCharacteristicConfig<PropsType>>;
}

export function features<PropsType extends BasePropsType>(
  Service: typeof hap.Service,
  Characteristic: typeof hap.Characteristic,
  log: hb.Logging,
): Features<PropsType> {
  return {
    accessoryInfo(name, model, deviceId) {
      return [
        {
          service: Service.AccessoryInformation,
          characteristic: Characteristic.Name,
          value: name,
        },
        {
          service: Service.AccessoryInformation,
          characteristic: Characteristic.Manufacturer,
          value: "Xiaomi",
        },
        {
          service: Service.AccessoryInformation,
          characteristic: Characteristic.Model,
          value: model,
        },
        {
          service: Service.AccessoryInformation,
          characteristic: Characteristic.SerialNumber,
          value: `${deviceId}`,
        },
        {
          service: Service.AccessoryInformation,
          characteristic: Characteristic.Identify,
          value: (callback: hb.CharacteristicGetCallback) => {
            log.info(`Identified device "${name}"`);
            callback(null);
          },
        },
      ];
    },

    currentState(key, params) {
      return {
        service: Service.HumidifierDehumidifier,
        characteristic: Characteristic.CurrentHumidifierDehumidifierState,
        props: {
          validValues: [
            Characteristic.CurrentHumidifierDehumidifierState.INACTIVE,
            Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING,
          ],
        },
        key: key,
        get: {
          map: (it) =>
            it === params.on
              ? Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING
              : Characteristic.CurrentHumidifierDehumidifierState.INACTIVE,
        },
      };
    },

    targetState() {
      return {
        service: Service.HumidifierDehumidifier,
        characteristic: Characteristic.TargetHumidifierDehumidifierState,
        props: {
          validValues: [
            Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER,
          ],
        },
        value: Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER,
      };
    },

    active(key, setCall, params) {
      return {
        service: Service.HumidifierDehumidifier,
        characteristic: Characteristic.Active,
        key: key,
        get: {
          map: (it) =>
            it === params.on
              ? Characteristic.Active.ACTIVE
              : Characteristic.Active.INACTIVE,
        },
        set: {
          call: setCall,
          map: (it) =>
            it === Characteristic.Active.ACTIVE ? params.on : params.off,
        },
      };
    },

    rotationSpeed(key, setCall, params) {
      return {
        service: Service.HumidifierDehumidifier,
        characteristic: Characteristic.RotationSpeed,
        props: {
          // Home.app automatically sends power off command when
          // rotation speed is set to 0, so to be able to set lowest speed
          // we need to start from 1.
          minValue: 0,
          maxValue: params.modes.length,
        },
        key: key,
        get: {
          map: (it) => {
            const index = params.modes.findIndex((mode) => mode === it);
            return index > 0 ? index + 1 : 1;
          },
        },
        set: {
          call: setCall,
          map: (it) =>
            it >= 1 && it <= params.modes.length
              ? params.modes[(it as number) - 1]
              : params.modes[0],
        },
      };
    },

    humidity<PropKey extends keyof PropsType>(
      key: PropKey,
    ): AnyCharacteristicConfig<PropsType> {
      return {
        service: Service.HumidifierDehumidifier,
        characteristic: Characteristic.CurrentRelativeHumidity,
        key: key,
        get: {
          map: (it) => it,
        },
      };
    },

    humidityThreshold(key, setCall, params) {
      return {
        service: Service.HumidifierDehumidifier,
        characteristic: Characteristic.RelativeHumidityHumidifierThreshold,
        key: key,
        get: {
          map: (it) => it,
        },
        set: {
          call: setCall,
          map: (it) => {
            if (it < params.min) {
              it = params.min;
            } else if (it > params.max) {
              it = params.max;
            }

            return it as PropsType[typeof key];
          },
          beforeSet: async ({ protocol }) => {
            if (params.switchToMode) {
              const { key, call, value } = params.switchToMode;
              await protocol.setProp(key, call, value);
            }
          },
          afterSet: ({ characteristic, mappedValue }) => {
            // Update characteristic immediately is not working, so
            // update it after a small delay.
            setTimeout(() => {
              characteristic.updateValue(mappedValue);
            }, 200);
          },
        },
      };
    },

    lockPhysicalControls(key, setCall, params) {
      return {
        service: Service.HumidifierDehumidifier,
        characteristic: Characteristic.LockPhysicalControls,
        key: key,
        get: {
          map: (it) =>
            it === params.on
              ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
              : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED,
        },
        set: {
          call: setCall,
          map: (it) =>
            it === Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED
              ? params.on
              : params.off,
        },
      };
    },

    waterLevel(key, params) {
      return {
        service: Service.HumidifierDehumidifier,
        characteristic: Characteristic.WaterLevel,
        key: key,
        get: {
          // Some humidifier models return special values for water level
          // when water tank is detached, so we limit the value here.
          map: (it) =>
            Math.min(params.toChar(it as PropsType[typeof key]) as number, 100),
        },
      };
    },

    swingMode(key, setCall, params) {
      return {
        service: Service.HumidifierDehumidifier,
        characteristic: Characteristic.SwingMode,
        key: key,
        get: {
          map: (it) =>
            it === params.on
              ? Characteristic.SwingMode.SWING_ENABLED
              : Characteristic.SwingMode.SWING_DISABLED,
        },
        set: {
          call: setCall,
          map: (it) =>
            it === Characteristic.SwingMode.SWING_ENABLED
              ? params.on
              : params.off,
        },
      };
    },

    ledBulb(key, setCall, params) {
      const result: Array<AnyCharacteristicConfig<PropsType>> = [];

      result.push({
        service: Service.Lightbulb,
        characteristic: Characteristic.Name,
        value: params.name || "Humidifier LED",
      });

      if (params.modes.length > 2) {
        result.push({
          service: Service.Lightbulb,
          characteristic: Characteristic.Brightness,
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

      result.push({
        service: Service.Lightbulb,
        characteristic: Characteristic.On,
        key: key,
        get: {
          map: (it) => it !== params.off,
        },
        set: {
          call: setCall,
          map: (it) => (it ? params.on : params.off),
          beforeSet: ({ value, characteristic }) => {
            // HomeKit trying to set "On" to true after changing brightness
            // which cause switching brightness back to Dim.
            // So skip set if bulb has already turned on.
            return value === characteristic.value;
          },
        },
      });

      return result;
    },

    buzzerSwitch(key, setCall, params) {
      const name = params.name || "Humidifier Buzzer";
      return [
        {
          service: Service.Switch,
          name: {
            displayName: name,
            subtype: "buzzer-switch",
          },
          characteristic: Characteristic.Name,
          value: name,
        },

        {
          service: Service.Switch,
          name: {
            displayName: name,
            subtype: "buzzer-switch",
          },
          characteristic: Characteristic.On,
          key: key,
          get: {
            map: (it) => it === params.on,
          },
          set: {
            call: setCall,
            map: (it) => (it ? params.on : params.off),
          },
        },
      ];
    },

    humiditySensor(key, params) {
      return [
        {
          service: Service.HumiditySensor,
          characteristic: Characteristic.Name,
          value: params.name || "Humidifier Humidity",
        },
        {
          service: Service.HumiditySensor,
          characteristic: Characteristic.CurrentRelativeHumidity,
          key: key,
        },
      ];
    },

    temperatureSensor(key, params) {
      return [
        {
          service: Service.TemperatureSensor,
          characteristic: Characteristic.Name,
          value: params.name || "Humidifier Temperature",
        },
        {
          service: Service.TemperatureSensor,
          characteristic: Characteristic.CurrentTemperature,
          key: key,
          get: {
            map: params.toChar as GetMapFunc<PropsType>,
          },
        },
      ];
    },

    cleanModeSwitch(key, setCall, params) {
      const name = params.name || "Humidifier Clean Mode";
      return [
        {
          service: Service.Switch,
          name: {
            displayName: name,
            subtype: "clean-mode-switch",
          },
          characteristic: Characteristic.Name,
          value: name,
        },

        {
          service: Service.Switch,
          name: {
            displayName: name,
            subtype: "clean-mode-switch",
          },
          characteristic: Characteristic.On,
          key: key,
          get: {
            map: (it) => it === params.on,
          },
          set: {
            call: setCall,
            map: (it) => (it ? params.on : params.off),
          },
        },
      ];
    },
  };
}
