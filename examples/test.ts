import { parseRoute } from "./routeParser.tartak";

declare function redirect<Route extends string>(
  route: Route,
  params: parseRoute<Route>
): void;

redirect("/api/v1/user/<id:string>", {
  id: "123", // OK
});

redirect("/api/v1/user/<id:string>", {
  // @ts-expect-error
  id: 123, // Error: Type 'number' is not assignable to type 'string'
});

redirect("/api/v1/user/<id:string>", {
  // @ts-expect-error
  hello: "123", // Error: Object literal may only specify known properties, and hello does not exist in type:
});
