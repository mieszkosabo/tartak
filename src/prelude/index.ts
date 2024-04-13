import { Call, Fn, PartialApply, _ } from "hotscript";

export type MapWithCaptures<
  fn extends Fn,
  captures extends any[],
  tuple extends readonly any[] | _ = _
> = PartialApply<MapWithCaputresFn, [fn, captures, tuple]>;
interface MapWithCaputresFn extends Fn {
  return: this["args"] extends [
    infer fn extends Fn,
    infer captures extends unknown[],
    infer tuple extends unknown[]
  ]
    ? {
        [key in keyof tuple]: Call<fn, tuple[key], captures>;
      }
    : never;
}
