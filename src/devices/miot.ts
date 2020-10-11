import { BaseHumidifier, BasePropsType, PrimitiveType } from "./humidifier";
import { BaseProtocol } from "./protocol";
import { ValueOf } from "./utils";

export type MiotArg = {
  did: number | string;
  siid: number;
  piid: number;
  value: PrimitiveType | null;
};

export type MiotResult = {
  did: number | string;
  siid: number;
  piid: number;
  code: number;
  value: PrimitiveType;
};

export abstract class MiotHumidifier<
  PropsType extends BasePropsType
> extends BaseHumidifier<PropsType, MiotArg, MiotResult, MiotArg, MiotResult> {
  protected getCallName(): string {
    return "get_properties";
  }

  protected checkSetResult(result: MiotResult): boolean {
    return "code" in result && result.code === 0;
  }

  protected extractValue(result: MiotResult): ValueOf<PropsType> {
    return result.value as ValueOf<PropsType>;
  }
}

type GetArgType = MiotArg;
type GetResultType = MiotResult;
type SetArgType = MiotArg;
type SetResultType = MiotResult;

export abstract class MiioProtocol<
  PropsType extends BasePropsType
> extends BaseProtocol<
  PropsType,
  GetArgType,
  GetResultType,
  SetArgType,
  SetResultType
> {
  protected getCallName(): string {
    return "get_properties";
  }

  protected checkSetResult(result: SetResultType): boolean {
    return "code" in result && result.code === 0;
  }

  protected unpackGetResult(result: GetResultType): ValueOf<PropsType> {
    return result.value as ValueOf<PropsType>;
  }
}
