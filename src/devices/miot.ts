import { BaseHumidifier, BasePropsType } from "./base";
import { ValueOf } from "./utils";

export type MiotArg<PropValue> = {
  did: number | string;
  siid: number;
  piid: number;
  value: PropValue | null;
};

export type MiotResult<PropValue> = {
  did: number | string;
  siid: number;
  piid: number;
  code: number;
  value: PropValue;
};

export abstract class MiotHumidifier<
  PropsType extends BasePropsType
> extends BaseHumidifier<
  PropsType,
  MiotArg<ValueOf<PropsType>>,
  MiotResult<ValueOf<PropsType>>,
  MiotArg<ValueOf<PropsType>>,
  MiotResult<ValueOf<PropsType>>
> {
  protected getCallName(): string {
    return "get_properties";
  }

  protected checkSetResult(result: MiotResult<ValueOf<PropsType>>): boolean {
    return "code" in result && result.code === 0;
  }

  protected extractValue(
    result: MiotResult<ValueOf<PropsType>>,
  ): ValueOf<PropsType> {
    return result.value;
  }
}
