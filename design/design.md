# Tartak

A programming language that compiles to TypeScript **types**.

## Motivation

Writing complex types is difficult, repetitive, error-prone and all around cumbersome.
Tartak aims to make it easier to write complex types by providing a more expressive syntax that is easier to read and write.

---

## Features

- [ ] Basic types
- [ ]

```
fn identity(x: number) -> number {
  return x;
}

```

```
fn fib(n: number) -> number {
  if n <= 1 {
    n
  } else {
    fib(n - 1) + fib(n - 2)
  }
}

fn append<T>(arr: T[], x: T) -> T[] {
  let appended = [...arr, x];

  appended
}
```

```ts
type ParseUrlParams<Url> = Url extends `${infer Path}(${infer OptionalPath})`
  ? ParseUrlParams<Path> & Partial<ParseUrlParams<OptionalPath>>
  : Url extends `${infer Start}/${infer Rest}`
  ? ParseUrlParams<Start> & ParseUrlParams<Rest>
  : Url extends `:${infer Param}`
  ? { [K in Param]: string }
  : {};
```

```tartak
fn ParseUrlParams(url: string) {
  match url {
    `${infer Path}(${infer OptionalPath})` => {
      ParseUrlParams(Path) & Partial<ParseUrlParams<OptionalPath>>
    }
    `${infer Start}/${infer Rest}` => {
      ParseUrlParams(Start) & ParseUrlParams<Rest>
    }
    `:${infer Param}` => {
      { [K in Param]: string }
    }
    _ => {}
  }
}

```

```tartak

type sth = :{
  let a = 1;
  let b = 2;
  let c = a | b;
  return c;
}




```
