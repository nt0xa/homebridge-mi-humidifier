import { BasePropsType, PrimitiveType } from "../humidifier";
import { BaseProtocol } from "./protocol";
import { ValueOf } from "../utils";

type GetArgType = string;
type GetResultType = PrimitiveType;
type SetArgType = PrimitiveType;
type SetResultType = string;

export class MiioProtocol<PropsType extends BasePropsType> extends BaseProtocol<
  PropsType,
  GetArgType,
  GetResultType,
  SetArgType,
  SetResultType
> {
  protected getCallName(): string {
    return "get_prop";
  }

  protected checkSetResult(result: string): boolean {
    return result === "ok";
  }

  protected unpackGetResult(result: GetResultType): ValueOf<PropsType> {
    return result as ValueOf<PropsType>;
  }

  protected getCallArg(prop: keyof PropsType): GetArgType {
    return prop as string;
  }

  protected setCallArg(
    _prop: keyof PropsType,
    value: ValueOf<PropsType>,
  ): SetArgType {
    return value;
  }
}
