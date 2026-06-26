declare module 'scroll-to-element' {
	export interface ScrollOptions {
		offset?: number;
		align?: 'top' | 'middle' | 'bottom' | string;
		duration?: number;
		ease?: string;
	}

	export default function scrollToElement(
		element: Element | string,
		options?: ScrollOptions,
	): void;
}

// Minimal `process.env` declaration so the optional debug flag
// `REACT_APP_JFV_DEBUG` can be read without pulling in `@types/node`.
declare const process: {
	env: {
		REACT_APP_JFV_DEBUG?: string;
		NODE_ENV?: string;
	};
};

declare module 'classnames' {
	type ClassValue = string | number | boolean | undefined | null | ClassDictionary | ClassArray;
	interface ClassDictionary { [id: string]: unknown }
	interface ClassArray extends Array<ClassValue> {}

	function classNames(...args: ClassValue[]): string;
	export default classNames;
}
