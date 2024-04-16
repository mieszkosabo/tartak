import { Fn, Apply, Call } from "hotscript";

declare const unset: unique symbol;
declare const _: unique symbol;
/**
 * A placeholder type that can be used to indicate that a parameter is not set.
 */
export type unset = typeof unset;
/**
 * A placeholder type that can be used to indicate that a parameter is to partially applied.
 */
export type _ = typeof _;

export type Expect<T extends true> = T;

export type Map<
  fn extends Fn,
  tuple extends readonly any[] | unset = unset
> = Apply<MapFn, [fn, tuple]>;
interface MapFn extends Fn {
  return: this["args"] extends [
    infer fn extends Fn,
    infer tuple extends unknown[]
  ]
    ? {
        [key in keyof tuple]: Apply<fn, [[tuple[key]]]>;
      }
    : never;
}
