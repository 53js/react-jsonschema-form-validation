/**
 * Type-level assertion helpers. Small, dependency-free equivalent of what
 * `tsd` or `expect-type` provides.
 *
 * Usage:
 *   type _ = Expect<Equal<Foo, Bar>>;  // fails to compile if Foo ≠ Bar
 *
 * `Equal<X, Y>` uses the well-known conditional-type trick that TypeScript
 * distinguishes between "identical" and "assignable-in-both-directions"
 * types — so `Equal<{a: 1}, {a: 1, b?: 2}>` is `false`, unlike a naive
 * `X extends Y & Y extends X` check.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Expect<T extends true> = T;

export type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends
	(<T>() => T extends Y ? 1 : 2) ? true : false;

// Silence "file has no imports/exports" if Expect/Equal are the only members
export {};
