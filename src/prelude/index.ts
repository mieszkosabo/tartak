import { Fn, Apply, Numbers, Tuples, Call, Booleans } from "hotscript";

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

export type Map<tuple extends readonly any[], fn extends Fn> = Apply<
  MapFn,
  [fn, tuple]
>;
interface MapFn extends Fn {
  return: this["args"] extends [
    infer fn extends Fn,
    infer tuple extends unknown[]
  ]
    ? {
        [key in keyof tuple]: Apply<fn, [tuple[key]]>;
      }
    : never;
}

export type Sort<
  tuple extends readonly any[],
  predicateFn extends Fn = Numbers.LessThanOrEqual
> = Call<Tuples.Sort<predicateFn>, tuple>;

export type Sum<tuple extends readonly any[]> = Call<Tuples.Sum, tuple>;

export type Head<tuple extends readonly any[]> = Call<Tuples.Head, tuple>;

export type Tail<tuple extends readonly any[]> = Call<Tuples.Tail, tuple>;

export type Last<tuple extends readonly any[]> = Call<Tuples.Last, tuple>;

export type At<tuple extends readonly any[], index extends number> = Call<
  Tuples.At<index>,
  tuple
>;

export type Drop<tuple extends readonly any[], n extends number> = Call<
  Tuples.Drop<n>,
  tuple
>;

export type Take<tuple extends readonly any[], n extends number> = Call<
  Tuples.Take<n>,
  tuple
>;

export type NotEquals<A, B> = Call<Booleans.Not<Call<Booleans.Equals<A, B>>>>;
