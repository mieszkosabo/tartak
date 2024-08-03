import {
  Fn,
  Numbers,
  Tuples,
  Objects,
  Strings,
  Call,
  Booleans,
} from "hotscript";

export type Expect<T extends true> = T;

export type Map<tuple extends readonly any[], fn extends Fn> = Call<
  Tuples.Map<fn>,
  tuple
>;

export type Filter<type extends readonly any[], predicateFn extends Fn> = Call<
  Tuples.Filter<predicateFn>,
  type
>;

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

export type ToUnion<tuple> = Call<Tuples.ToUnion, tuple>;

export type Partition<
  tuple extends readonly any[],
  predicateFn extends Fn
> = Call<Tuples.Partition<predicateFn>, tuple>;

export type IsEmpty<tuple extends readonly any[]> = Call<Tuples.IsEmpty, tuple>;

export type Zip<
  tuple1 extends readonly any[],
  tuple2 extends readonly any[]
> = Call<Tuples.Zip, tuple1, tuple2>;

export type ZipWith<
  tuple1 extends readonly any[],
  tuple2 extends readonly any[],
  fn extends Fn
> = Call<Tuples.ZipWith<fn>, tuple1, tuple2>;

export type FlatMap<tuple extends readonly any[], fn extends Fn> = Call<
  Tuples.FlatMap<fn>,
  tuple
>;

export type Find<tuple extends readonly any[], predicateFn extends Fn> = Call<
  Tuples.Find<predicateFn>,
  tuple
>;

export type TakeWhile<
  tuple extends readonly any[],
  predicateFn extends Fn
> = Call<Tuples.TakeWhile<predicateFn>, tuple>;

export type GroupBy<tuple extends readonly any[], fn extends Fn> = Call<
  Tuples.GroupBy<fn>,
  tuple
>;

export type Join<tuple extends readonly any[], separator extends string> = Call<
  Tuples.Join<separator>,
  tuple
>;

export type Reduce<
  tuple extends readonly any[],
  fn extends Fn,
  initialValue
> = Call<Tuples.Reduce<fn, initialValue>, tuple>;

export type ReduceRight<
  tuple extends readonly any[],
  fn extends Fn,
  initialValue
> = Call<Tuples.ReduceRight<fn, initialValue>, tuple>;

export type Reverse<tuple extends readonly any[]> = Call<Tuples.Reverse, tuple>;

export type Every<tuple extends readonly any[], predicateFn extends Fn> = Call<
  Tuples.Every<predicateFn>,
  tuple
>;

export type SplitAt<tuple extends readonly any[], index extends number> = Call<
  Tuples.SplitAt<index>,
  tuple
>;

export type ToIntersection<tuple> = Call<Tuples.ToIntersection, tuple>;

export type Prepend<tuple extends readonly any[], element> = Call<
  Tuples.Prepend<element>,
  tuple
>;

export type Append<tuple extends readonly any[], element> = Call<
  Tuples.Append<element>,
  tuple
>;

export type Concat<
  tuple1 extends readonly any[],
  tuple2 extends readonly any[]
> = Call<Tuples.Concat, tuple1, tuple2>;

export type Min<tuple extends readonly any[]> = Call<Tuples.Min, tuple>;

export type Max<tuple extends readonly any[]> = Call<Tuples.Max, tuple>;

// Strings
export type Length<Str extends string> = Call<Strings.Length, Str>;

export type TrimLeft<Str extends string, Sep extends string> = Call<
  Strings.TrimLeft<Sep>,
  Str
>;

export type TrimRight<Str extends string, Sep extends string> = Call<
  Strings.TrimRight<Sep>,
  Str
>;

export type Trim<Str extends string, Sep extends string> = Call<
  Strings.Trim<Sep>,
  Str
>;

export type Replace<
  Str extends string,
  Pattern extends string,
  Replacement extends string
> = Call<Strings.Replace<Pattern, Replacement>, Str>;

// export type Slice<
//   Str extends string,
//   Start extends number,
//   End extends number
// > = Call<Strings.Slice<Start, End>, Str>;

export type Split<Str extends string, Separator extends string> = Call<
  Strings.Split<Separator, Str>
>;

export type Repeat<Str extends string, Count extends number> = Call<
  Strings.Repeat<Count>,
  Str
>;

export type StartsWith<Str extends string, Prefix extends string> = Call<
  Strings.StartsWith<Prefix, Str>
>;

export type EndsWith<Str extends string, Suffix extends string> = Call<
  Strings.EndsWith<Suffix, Str>
>;

export type ToTuple<Str extends string> = Call<Strings.ToTuple, Str>;

export type ToNumber<Str extends string> = Call<Strings.ToNumber, Str>;
export type ToString<Str extends number> = Call<Strings.ToString, Str>;

export type StringsPrepend<Str extends string, Prefix extends string> = Call<
  Strings.Prepend<Prefix>,
  Str
>;

export type StringsAppend<Str extends string, Suffix extends string> = Call<
  Strings.Append<Suffix>,
  Str
>;

export type Uppercase<Str extends string> = Call<Strings.Uppercase, Str>;
export type Lowercase<Str extends string> = Call<Strings.Lowercase, Str>;
export type Capitalize<Str extends string> = Call<Strings.Capitalize, Str>;
export type Uncapitalize<Str extends string> = Call<Strings.Uncapitalize, Str>;
export type SnakeCase<Str extends string> = Call<Strings.SnakeCase, Str>;
export type CamelCase<Str extends string> = Call<Strings.CamelCase, Str>;
export type KebabCase<Str extends string> = Call<Strings.KebabCase, Str>;
export type Compare<Str1 extends string, Str2 extends string> = Call<
  Strings.Compare,
  Str1,
  Str2
>;
export type LessThan<Str1 extends string, Str2 extends string> = Call<
  Strings.LessThan,
  Str1,
  Str2
>;

export type LessThanOrEqual<Str1 extends string, Str2 extends string> = Call<
  Strings.LessThanOrEqual,
  Str1,
  Str2
>;

export type GreaterThan<Str1 extends string, Str2 extends string> = Call<
  Strings.GreaterThan,
  Str1,
  Str2
>;

export type GreaterThanOrEqual<Str1 extends string, Str2 extends string> = Call<
  Strings.GreaterThanOrEqual,
  Str1,
  Str2
>;

// Objects
export type FromEntries<union> = Call<Objects.FromEntries, union>;

export type MapValues<obj extends Record<string, any>, fn extends Fn> = Call<
  Objects.MapValues<fn>,
  obj
>;

// Numbers
export type Abs<n extends number> = Call<Numbers.Abs, n>;

// Other
export type NotEquals<A, B> = Call<Booleans.Not<Call<Booleans.Equals<A, B>>>>;
