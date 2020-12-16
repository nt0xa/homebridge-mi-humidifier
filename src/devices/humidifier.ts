import type * as hb from "homebridge";
import type * as hap from "hap-nodejs";

import { PlatformAccessory } from "../platform";
import { Humidifier } from "./factory";
import { AnyCharacteristicConfig } from "./features";
import { Protocol } from "./protocols/protocol";
import { ValueOf } from "./utils";

/**
 * Base class for all humidifiers, all humidifiers must inherit from this class.
 *
 * @typeParam PropsType key-value type containing all supported device
 *   properties types. For better defaults it is recommended to use
 *   device properties names as keys is possible.
 */
export class BaseHumidifier<PropsType extends BasePropsType>
  implements Humidifier {
  private readonly protocol: Protocol<PropsType>;
  private readonly features: Array<AnyCharacteristicConfig<PropsType>>;
  private readonly log: hb.Logging;

  private props: GetEntry<PropsType>[];
  private cache: PropsType;

  /**
   * @param device miio.Device returned by miio.discover function.
   * @param log homebridge logger.
   */
  constructor(
    protocol: Protocol<PropsType>,
    featues: Array<AnyCharacteristicConfig<PropsType>>,
    log: hb.Logging,
  ) {
    this.protocol = protocol;
    this.features = featues;
    this.log = log;

    this.props = [];
    this.cache = {} as PropsType;
  }

  /**
   * Adds services and characteristics to the accessory.
   * This method should be overwritten in child classes to add
   * all nesessary services and characteristics.
   *
   * @param accessory homebridge accessory
   */
  configureAccessory(accessory: PlatformAccessory): void {
    this.features.forEach((feature) => {
      this.register(accessory, feature);
    });
  }

  /**
   * Function to use in polling.
   *
   * Requests all registered device properties and stores them in cache
   * to return later in `CharacteristicGetCallback`.  Also asynchronously
   * updates corresponding HomeKit characteristics.
   */
  public async update(): Promise<void> {
    try {
      this.cache = await this.protocol.getProps(
        this.props.map((prop) => prop.key),
      );
      this.props.forEach((prop) => {
        this.log.debug(
          "Updating prop",
          prop.key,
          this.cache[prop.key],
          prop.map(this.cache[prop.key]),
        );
        prop.characteristic.updateValue(prop.map(this.cache[prop.key]));
      });
    } catch (err) {
      this.log.error("Fail to get props.", err);
    }
  }

  /**
   * Registers characteristic for the given accessory and service.
   */
  register<PropsKey extends keyof PropsType>(
    accessory: PlatformAccessory,
    config: CharacteristicConfig<PropsKey, PropsType[PropsKey]>,
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
      const getEntry: GetEntry<PropsType> = {
        key: config.key,
        characteristic: characteristic,
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
        const setEntry: SetEntry<PropsType> = {
          key: config.key,
          call: config.set.call,
          characteristic: characteristic,
          map: config.set.map
            ? (config.set.map as SetMapFunc<PropsType>)
            : (it: hb.CharacteristicValue) => it as ValueOf<PropsType>, // by default use the same value.
          beforeSet: config.set.beforeSet as BeforeSetFunc<PropsType>,
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
   * Function which is used as homebridge `CharacteristicGetCallback` for
   * all registered characteristics.
   *
   * Returns last cahed property value. This method don't make
   * device call because some devices are slow to respond and if we
   * will request every prop from device here HomeKit will become unresponsive.
   *
   * @param entry `GetEntry` object for prop.
   * @param callback characteristic get callback.
   */
  private getProp(
    entry: GetEntry<PropsType>,
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
   * @param entry `SetEntry` object for prop.
   * @param value value to set for property.
   * @param callback characteristic set callback.
   */
  private async setProp(
    entry: SetEntry<PropsType>,
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
          this.protocol,
        );

        if (skip) {
          callback();
          return;
        }
      }

      await this.protocol.setProp(entry.key, entry.call, entry.map(value));

      callback();
    } catch (err) {
      this.log.error("Fail to set property '%s'.", entry.key, err);
      callback(err);
    }
  }
}

/**
 * Device property value type.
 */
export type PrimitiveType = string | number | boolean;

/**
 * Base props type.
 * `PropsType` of child class must this type.
 */
export type BasePropsType = { [key: string]: PrimitiveType };

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
type BeforeSetFunc<PropsType> = (
  value: PrimitiveType,
  characteristic: hb.Characteristic,
  callback: hb.CharacteristicSetCallback,
  protocol: Protocol<PropsType>,
) => Promise<boolean>;

/**
 * GetEntry contains all required information
 * to get property from device, convert it to HomeKit characteristic value
 * and update corresponding accessory characteristic.
 */
export type GetEntry<PropsType> = {
  // Property identifier.
  key: keyof PropsType;

  // Accessory characteristic that must be updated with device property value.
  characteristic: hb.Characteristic;

  // Function that converts device property to corresponding characteristic value.
  map: (it: ValueOf<PropsType>) => hb.CharacteristicValue;
};

/**
 * GetEntry contains all information required to
 * convert HomeKit characteristic value to device property
 * and set it on the device.
 */
export type SetEntry<PropsType> = {
  // Property identifier.
  key: keyof PropsType;

  // Accessory characteristic.
  characteristic: hb.Characteristic;

  // Name of device call that updates the property.
  call: string;

  // Function that converts characteristic value to corresponding device property value.
  map: (it: hb.CharacteristicValue) => ValueOf<PropsType>;

  // Function that is called before settings the device property.
  // Can be used to add some extra logic.
  // If returns `true` set will be skipped.
  beforeSet?: BeforeSetFunc<PropsType>;
};

/**
 * Useful type aliases.
 */
export type Characteristic = hb.WithUUID<new () => hap.Characteristic>;
export type Service = hb.WithUUID<typeof hap.Service>;

/**
 * CharacteristicConfig is used to register characteristic for accessory.
 */
export type CharacteristicConfig<PropKey, PropValue> =
  | CharacteristicConfigStatic
  | CharacteristicConfigDynamic<PropKey, PropValue>;

export type CharacteristicConfigStatic = {
  // HomeKit service.
  service: Service;
  // HomeKit characteristic.
  characteristic: Characteristic;
  // HomeKit characteristic properties if required.
  props?: Partial<hb.CharacteristicProps>;
  // HomeKit characteristic value.
  value: hb.CharacteristicValue;
};

export type CharacteristicConfigDynamic<PropKey, PropValue> = {
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
    // Function that converts device property value to the corresponding
    // HomeKit characteristic value.
    // If not provided the same value will be used.
    map?: (it: PropValue) => hb.CharacteristicValue;
  };
  // Characteristic set config.
  set?: {
    // Set characteristic call name.
    call: string;

    // Function that converts HomeKit characteristic value
    // to the corresponding device property value.
    // If not provided the same value will be used.
    map?: (it: hb.CharacteristicValue) => PropValue;

    // Function that is called before settings the device property.
    // Can be used to add some extra logic.
    // If returns `true` set will be skipped.
    beforeSet?: <PropsType>(
      value: PropValue,
      characteristic: hb.Characteristic,
      callback: hb.CharacteristicSetCallback,
      protocol: Protocol<PropsType>,
    ) => boolean | Promise<boolean>;
  };
};
