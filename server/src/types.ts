/**
 * A Rule defines how a Web Accessibilty rule is
 * written in a `JSON` and interpeteted with in the language server.
 */
export interface Rule {
	/**
	 * The type describes what kind of rule it's 
	 * going to implement for example `Semantic`,
	 *  `Missing`, `Duplicant` etc.
	 */
	type: string;
	/**
	 * An identifier is an Regular expression
     * that filters out the use full bit's of text
     * that will be examined for any possible
     * Web Accessibility violations.
	 * 
	 * The first capture groep will be used.
	 */
	identifier: RegExp;
	severity: Severity;
	message: string;
	filters: Filter[];
}

export interface Filter {
	indentifier: RegExp;
	options?: Option;
}

export interface Option {
	negative?: boolean;
	contains?: boolean;
	replace?: boolean;
}

export declare namespace Severity {
	const Error: 1;
	const Warning: 2;
	const Information: 3;
	const Hint: 4;
}

export declare type Severity = 1 | 2 | 3 | 4;