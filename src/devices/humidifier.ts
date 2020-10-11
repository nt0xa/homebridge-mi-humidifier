import type * as hb from "homebridge";
import type * as hap from "hap-nodejs";
import * as miio from "miio-api";

import { PlatformAccessory, DeviceOptions } from "../platform";
import { Humidifier, HumidifierModel } from "./factory";
import { Protocol } from "./protocol";
import { ValueOf } from "./utils";
import { RegisterHelper } from "./helper";

/**
 * Base class for all humidifiers, all humidifiers must inherit from this class.
 *
 * @typeParam PropsType key-value type containing all supported device
 *   properties types. For better defaults it is recommended to use
 *   device properties names as keys is possible.
 */
export abstract class BaseHumidifier<
  PropsType extends BasePropsType,
  GetArgType = string,
  GetResultType = PrimitiveType,
  SetArgType = PrimitiveType,
  SetResultType = string
> implements Humidifier {
  //
  protected readonly device: miio.Device;
  protected readonly model: HumidifierModel;
  protected readonly log: hb.Logging;
  protected readonly protocol: Protocol<PropsType>;

  private props: Array<GetEntry<PropsType, GetArgType>>;
  private cache: PropsType;
  private getPropsPromise: Promise<PropsType> | null;

  /**
   * @param device miio.Device returned by miio.discover function.
   * @param log homebridge logger.
   */
  constructor(device: miio.Device, model: HumidifierModel, log: hb.Logging) {
    this.device = device;
    this.model = model;
    this.log = log;
    this.protocol = this.getProtocol(device);

    this.props = [];
    this.cache = {} as PropsType;
    this.getPropsPromise = null;
  }

  get deviceModel(): HumidifierModel {
    return this.model;
  }

  /**
   * Returns Xiaomi device id (did).
   */
  get deviceId(): number {
    return this.device.id;
  }

  public helper(
    api: hb.API,
  ): RegisterHelper<PropsType, GetArgType, SetArgType> {
    const { Service, Characteristic } = api.hap;
    return new RegisterHelper(Service, Characteristic);
  }

  protected abstract getProtocol(device: miio.Device): Protocol<PropsType>;

  /**
   * Must return call name for getting properties from device.
   *
   * Example: "get_props" for `zhimi.humidifier.v1` or
   *   "get_properties" for `zhimi.humidifier.ca4`.
   */
  protected abstract getCallName(): string;

  /**
   * Must return `true` if set property call result is successful and `false` otherwise.
   */
  protected abstract checkSetResult(result: SetResultType): boolean;

  /**
   * Must return primitive value type from get property call result.
   */
  protected abstract extractValue(result: GetResultType): ValueOf<PropsType>;

  /**
   * Registers characteristic for the given accessory and service.
   */
  protected register<PropsKey extends keyof PropsType>(
    accessory: PlatformAccessory,
    config: CharacteristicConfig<
      PropsKey,
      PropsType[PropsKey],
      GetArgType,
      SetArgType
    >,
  ): void {
    const service =
      accessory.getService(config.service) ||
      accessory.addService(config.service);

    const characteristic = service.getCharacteristic(config.characteristic);

    if (config.props) {
      characteristic.setProps(config.props);
    }

    if ("value" in config) {
      // Static characteristic.
      characteristic.setValue(config.value);
    } else {
      // Dynamic characteristic.
      const getEntry: GetEntry<PropsType, GetArgType> = {
        key: config.key,
        characteristic: characteristic,
        arg: config.get?.arg
          ? (config.get.arg as GetArgFunc<PropsType, GetArgType>)
          : () => (config.key as unknown) as GetArgType, // by default use key.
        map: config.get?.map
          ? (config.get.map as GetMapFunc<PropsType>)
          : (it: PrimitiveType) => it, // by default return the same value.
      };

      if (!this.props.find((prop) => prop.key === config.key)) {
        this.props.push(getEntry);
      }

      characteristic.on("get", (callback: hb.CharacteristicGetCallback) => {
        this.getProp(getEntry, callback);
      });

      if (config.set) {
        const setEntry: SetEntry<PropsType, SetArgType> = {
          key: config.key,
          call: config.set.call,
          characteristic: characteristic,
          arg: config.set.arg
            ? (config.set.arg as SetArgFunc<PropsType, SetArgType>)
            : (_: keyof PropsType, value: PrimitiveType) =>
                (value as unknown) as SetArgType, // by default use the same value.
          map: config.set.map
            ? (config.set.map as SetMapFunc<PropsType>)
            : (it: hb.CharacteristicValue) => it as ValueOf<PropsType>, // by default use the same value.
          beforeSet: config.set.beforeSet as BeforeSetFunc,
        };

        characteristic.on(
          "set",
          async (
            value: hb.CharacteristicValue,
            callback: hb.CharacteristicSetCallback,
          ) => {
            return await this.setProp(setEntry, value, callback);
          },
        );
      }
    }
  }

  /**
   * Adds services and characteristics to the accessory.
   * This method should be overwritten in child classes to add
   * all nesessary services and characteristics.
   *
   * @param accessory homebridge accessory
   * @param api homebridge API
   * @param options additional options
   */
  public configureAccessory(
    accessory: PlatformAccessory,
    api: hb.API,
    _options: DeviceOptions,
  ): void {
    const { Service, Characteristic } = api.hap;

    // Add common characteristics for all devices.
    this.register(accessory, {
      service: Service.AccessoryInformation,
      characteristic: Characteristic.Manufacturer,
      value: "Xiaomi",
    });

    this.register(accessory, {
      service: Service.AccessoryInformation,
      characteristic: Characteristic.Model,
      value: this.model,
    });
  }

  /**
   * Function which is used as homebridge `CharacteristicGetCallback` for
   * all registered characteristics.
   *
   * Returns last cahed property value. This method don't make
   * device call because some devices are slow to respond and if we
   * will request every prop from device here HomeKit will become unresponsive.
   *
   * @param prop device property name.
   * @param propToChar function that converts property value to characteristic value.
   * @param callback characteristic get callback.
   */
  private getProp(
    entry: GetEntry<PropsType, GetArgType>,
    callback: hb.CharacteristicGetCallback,
  ): void {
    this.log.debug("Getting prop '%s'", entry.key);
    callback(null, entry.map(this.cache[entry.key]));
  }

  /**
   * Function which used as homebridge `CharacteristicSetCallback` for
   * all registered characteristics.
   *
   * This function in contrast to `getProp` makes device call.
   *
   * @param prop `SetEntry` for device property.
   * @param value value to set for property.
   * @param callback characteristic set callback.
   * @param options.beforeSet optional async function which will be called
   *   before setting the property.
   */
  private async setProp(
    entry: SetEntry<PropsType, SetArgType>,
    value: hb.CharacteristicValue,
    callback: hb.CharacteristicSetCallback,
  ) {
    this.log.debug("Setting prop '%s'", entry.key);
    try {
      if (entry.beforeSet) {
        const skip = await entry.beforeSet(
          value as PrimitiveType,
          entry.characteristic,
          callback,
        );

        if (skip) {
          callback();
          return;
        }
      }

      const [result] = await this.device.call<SetArgType[], SetResultType[]>(
        entry.call,
        [entry.arg(entry.key as string, entry.map(value))],
      );

      if (!this.checkSetResult(result)) {
        throw new Error(`Invalid result: ${JSON.stringify(result)}`);
      }

      callback();
    } catch (err) {
      this.log.error("Fail to set property '%s'.", entry.key, err);
      callback(err);
    }
  }

  /**
   * Function to use in polling.
   *
   * Requests all registered device properties and stores them in cache
   * to return later in `CharacteristicGetCallback`.  Also asynchronously
   * updates corresponding HomeKit characteristics.
   */
  async update(): Promise<void> {
    try {
      this.cache = await this.getAllProps();
      this.props.forEach((p) => {
        p.characteristic.updateValue(p.map(this.cache[p.key]));
      });
    } catch (err) {
      this.log.error("Fail to get props.", err);
    }
  }

  /**
   * Maps results array to key-value device props.
   *
   * Most models return results in the same order as get arguments,
   * but `shuii.humidifier.jsq001` "get_props" call don't accept any arguments
   * and just returns all props in fixed order. So we need ability
   * to modify this behaviour in subclasses.
   */
  protected mapResults(
    results: Array<GetResultType>,
    keys: Array<keyof PropsType>,
  ): PropsType {
    const result = {} as PropsType;

    keys.map((key, i) => {
      result[key] = this.extractValue(results[i]);
    });

    return result;
  }

  /**
   * Prepares get properties device call args from stored props.
   */
  protected prepareGetArgs(
    props: GetEntry<PropsType, GetArgType>[],
  ): GetArgType[] {
    return props.map((entry) => entry.arg(entry.key as string));
  }

  /**
   * Returns all registered device properties by requesting them from the device.
   * If called multiple times simultaneously does request only once and returns
   * the same promise for all callers.
   */
  private getAllProps(): Promise<PropsType> {
    if (!this.getPropsPromise) {
      this.getPropsPromise = new Promise<PropsType>((resolve, reject) => {
        this.device
          .call<unknown[], GetResultType[]>(
            this.getCallName(),
            this.prepareGetArgs(this.props),
          )
          .then((results) => {
            resolve(
              this.mapResults(
                results,
                this.props.map((entry) => entry.key),
              ),
            );
          })
          .catch((err) => reject(err));
      }).finally(() => {
        this.getPropsPromise = null;
      });
    }

    return this.getPropsPromise;
  }
}

/**
 * Base props type.
 * `PropsType` of child class must this type.
 */
export type BasePropsType = { [key: string]: PrimitiveType };

/**
 * Device property value type.
 */
export type PrimitiveType = string | number | boolean;

/**
 * Function that maps device property value to corresponding characteristic value.
 */
type GetMapFunc<PropsType> = (it: ValueOf<PropsType>) => hb.CharacteristicValue;

/**
 * Function that maps characteristic value to corresponding device property value.
 */
type SetMapFunc<PropsType> = (it: hb.CharacteristicValue) => ValueOf<PropsType>;

/**
 * Function that is called before settings the device property.
 */
type BeforeSetFunc = (
  value: PrimitiveType,
  characteristic: hb.Characteristic,
  callback: hb.CharacteristicSetCallback,
) => Promise<boolean>;

/**
 * Function that returns get property call argument.
 */
type GetArgFunc<PropsType, ArgType> = (key: keyof PropsType) => ArgType;

/**
 * Function that returns set property call argument.
 */
type SetArgFunc<PropsType, ArgType> = (
  key: keyof PropsType,
  value: PrimitiveType,
) => ArgType;

/**
 * GetEntry contains all required information
 * to get property from device, convert it to HomeKit characteristic value
 * and update corresponding accessory characteristic.
 */
export type GetEntry<PropsType, ArgType> = {
  // Property identifier.
  key: keyof PropsType;

  // Accessory characteristic that must be updated with device property value.
  characteristic: hb.Characteristic;

  // Argument for get properties device call.
  arg: GetArgFunc<PropsType, ArgType>;

  // Function that converts device property to corresponding characteristic value.
  map: (it: ValueOf<PropsType>) => hb.CharacteristicValue;
};

/**
 * GetEntry contains all information required to
 * convert HomeKit characteristic value to device property
 * and set it on the device.
 */
export type SetEntry<PropsType, ArgType> = {
  // Property identifier.
  key: keyof PropsType;

  // Accessory characteristic.
  characteristic: hb.Characteristic;

  // Name of device call that updates the property.
  call: string;

  // Function that converts device property value to set properties call argument.
  arg: SetArgFunc<PropsType, ArgType>;

  // Function that converts characteristic value to corresponding device property value.
  map: (it: hb.CharacteristicValue) => ValueOf<PropsType>;

  // Function that is called before settings the device property.
  // Can be used to add some extra logic.
  // If returns `true` set will be skipped.
  beforeSet?: BeforeSetFunc;
};

/**
 * Useful type aliases.
 */
export type Characteristic = hb.WithUUID<new () => hap.Characteristic>;
export type Service = hb.WithUUID<typeof hap.Service>;

/**
 * Config used to register characteristic for accessory.
 */
export type CharacteristicConfig<PropKey, PropValue, GetArgType, SetArgType> =
  // Static characteristic.
  | {
      // HomeKit service.
      service: Service;
      // HomeKit characteristic.
      characteristic: Characteristic;
      // HomeKit characteristic properties if required.
      props?: Partial<hb.CharacteristicProps>;
      // HomeKit characteristic value.
      value: hb.CharacteristicValue;
    }
  // Dynamic characteristic.
  | {
      // HomeKit service.
      service: Service;

      // HomeKit characteristic.
      characteristic: Characteristic;

      // HomeKit characteristic properties if required.
      props?: Partial<hb.CharacteristicProps>;

      // Device props key. Used as property identifier.
      key: PropKey;

      // Characteristic get config.
      get?: {
        // Function that uses device property key and value
        // to return argument for get properties call.
        // This mostly required for MiOT proptocol.
        // If not provided the key will be used.
        arg?: (key: PropKey) => GetArgType;

        // Function that converts device property value to the corresponding
        // HomeKit characteristic value.
        // If not provided the same value will be used.
        map?: (it: PropValue) => hb.CharacteristicValue;
      };
      // Characteristic set config.
      set?: {
        // Set characteristic call name.
        call: string;

        // Function that uses device property key and value
        // to return argument for set property call.
        // This mostly required for MiOT proptocol.
        // If not provided the key will be used.
        arg?: (key: PropKey, value: PropValue) => SetArgType;

        // Function that converts HomeKit characteristic value
        // to the corresponding device property value.
        // If not provided the same value will be used.
        map?: (it: hb.CharacteristicValue) => PropValue;

        // Function that is called before settings the device property.
        // Can be used to add some extra logic.
        // If returns `true` set will be skipped.
        beforeSet?: (
          value: PropValue,
          characteristic: hb.Characteristic,
          callback: hb.CharacteristicSetCallback,
        ) => boolean | Promise<boolean>;
      };
    };
