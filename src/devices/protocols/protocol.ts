import * as miio from "miio-api";
import { BasePropsType } from "../humidifier";
import { ValueOf } from "../utils";

/**
 * High level API for the device.
 */
export interface Protocol<PropsType> {
  setProp<PropKey extends keyof PropsType>(
    prop: PropKey,
    call: string,
    value: PropsType[PropKey],
  ): Promise<void>;

  getProps(props: Array<keyof PropsType>): Promise<PropsType>;
}

/**
 * Protocol is a wrapper for miio.Device that handles all communications
 * with device and provides high level API.
 *
 * @typeParam PropsType key-value type (where key is string) containing all device
 *   props with their types.
 *
 * @typeParam GetArgType type of argument for `getProps` device call.
 *   For miIO devices it is a string (prop's name, e.g. "power", "mode", etc),
 *   For miOT devices it is an object like `{"did": "power", "siid": 2, "piid": 2, "value": null}`
 *
 * @typeParam GetResultType type of result of `getProps` device call.
 *   For miIO devices it is value of the requested prop.
 *   For miOT devices it is an object like `{... "value": <primitive value>}`
 *
 * @typeParam SetArgType type of argument for `setProp` device call.
 *   For miIO devices it is value of prop (prop determined by call name, e.g "set_power", "set_mode", etc.).
 *   For miOT devices it is and object like `{... "value": <primitive value>}`
 *
 * @typeParam SetResultType type of result of `setProp` device call.
 *   For miIO devices it is string "ok" (in case of error exception will be thrown).
 *   For miOT devices it is an object like `{... "code": 0, "value": <primitive value>}`.
 */
export abstract class BaseProtocol<
  PropsType extends BasePropsType,
  GetArgType,
  GetResultType,
  SetArgType,
  SetResultType
> implements Protocol<PropsType> {
  private device: miio.Device;
  private getPropsPromise: Promise<PropsType> | null;

  constructor(device: miio.Device) {
    this.device = device;
    this.getPropsPromise = null;
  }

  /**
   * Returns `getProps` device call name.
   * Must be implemented in subclasses.
   * Examples:
   *   `zhimi.humidifier.v1` — "get_prop"
   *   `zhimi.humidifier.ca4` — "get_properties"
   *   `shuii.humidifier.jsq001` — "get_props"
   */
  protected abstract getCallName(): string;

  /**
   * Returns `true` if set property call was successful and `false` otherwise.
   * Must be implemented in subclasses.
   */
  protected abstract checkSetResult(result: SetResultType): boolean;

  /**
   * Returns primitive value type extracted from `GetResultType`.
   * Must be implemented in subclasses.
   */
  protected abstract unpackGetResult(result: GetResultType): ValueOf<PropsType>;

  /**
   * Returns argument for prop for `getProps` device call.
   * Must be implemented in subclasses.
   *
   * @param prop device prop.
   * @return arg for `getProps` device call
   */
  protected abstract getCallArg(prop: keyof PropsType): GetArgType;

  /**
   * Returns argument for prop for `setProp` device call.
   * Must be implemented in subclasses.
   *
   * @param prop device prop.
   * @param value value of the corresponding prop.
   * @return arg for `setProp` device call
   */
  protected abstract setCallArg(
    prop: keyof PropsType,
    value: ValueOf<PropsType>,
  ): SetArgType;

  /**
   * Sest device prop.
   *
   * @param prop prop of device to set.
   * @param call name of `setProp` device call for the prop.
   * @param value value to set for property.
   * @returns promise which will be resolved when device call finished.
   */
  async setProp<PropKey extends keyof PropsType>(
    prop: PropKey,
    call: string,
    value: PropsType[PropKey],
  ): Promise<void> {
    const [result] = await this.device.call<SetArgType[], SetResultType[]>(
      call,
      [this.setCallArg(prop, value)],
    );

    if (!this.checkSetResult(result)) {
      throw new Error(`Invalid result: ${JSON.stringify(result)}`);
    }
  }

  /**
   * Gets device properties.
   *
   * If called multiple times simultaneously does request only once and returns
   * the same promise for all callers.
   *
   * @param array of requested device properties.
   * @return `PropsType` object containing all requested props values.
   */
  async getProps(props: Array<keyof PropsType>): Promise<PropsType> {
    if (!this.getPropsPromise) {
      // Save promise.
      this.getPropsPromise = new Promise<PropsType>((resolve, reject) => {
        this.device
          .call<GetArgType[], GetResultType[]>(
            this.getCallName(),
            this.prepareGetArgs(props),
          )
          .then((results) => {
            resolve(this.mapGetResults(results, props));
          })
          .catch((err) => reject(err));
      }).finally(() => {
        // Unset saved promise.
        this.getPropsPromise = null;
      });
    }

    // Return saved promise.
    return this.getPropsPromise;
  }

  /**
   * Maps results array of `getProps` device call to `PropsType`.
   *
   * Most humidifiers return results in the same order as get arguments,
   * but `shuii.humidifier.jsq001` "get_props" call don't accept any arguments
   * and just returns all props in fixed order, so we need ability to modify this
   * behaviour in subclasses.
   *
   * @param results array of results for `getProps` device call.
   * @param props array requested props in the same order as corresponding args
   *   was sent to device.
   * @return `PropsType` object containing all props values.
   */
  protected mapGetResults(
    results: Array<GetResultType>,
    props: Array<keyof PropsType>,
  ): PropsType {
    const result = {} as PropsType;

    props.map((prop, i) => {
      result[prop] = this.unpackGetResult(results[i]);
    });

    return result;
  }

  /**
   * Prepares `getProps` device call args for props.
   *
   * Moved into separate function to be able to override it
   * in subclasses.
   */
  protected prepareGetArgs(props: Array<keyof PropsType>): GetArgType[] {
    return props.map((prop) => this.getCallArg(prop));
  }
}
