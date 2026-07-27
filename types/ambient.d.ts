// Local ambient declarations used only during type-checking. Not published.

// `scroll-to-element` ships no type declarations.
declare module 'scroll-to-element' {
	export default function scrollToElement(
		element: Element | string,
		options?: { offset?: number; align?: string; duration?: number; ease?: string },
	): void;
}

// Minimal `process` declaration for the optional debug flag
// `REACT_APP_JFV_DEBUG`, without pulling in `@types/node`. Typed as
// possibly-undefined because browser bundlers (Vite, esbuild, native
// ESM) do not polyfill it — call sites must guard access.
declare const process: {
	env?: {
		REACT_APP_JFV_DEBUG?: string;
		NODE_ENV?: string;
	};
} | undefined;

declare module 'classnames' {
	type ClassValue = string | number | boolean | undefined | null | ClassDictionary | ClassArray;
	interface ClassDictionary { [id: string]: unknown }
	interface ClassArray extends Array<ClassValue> {}

	function classNames(...args: ClassValue[]): string;
	export default classNames;
}
