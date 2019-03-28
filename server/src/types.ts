/**
 * A Rule defines how a Web Accessibilty rule is
 * written in a `JSON` and interpeteted with in the language server.
 */
export interface Rule {
	/**
	 * The type describes what kind of rule it's 
	 * going to implement for example `Semantic`,
	 *  `Missing`, `Duplicant` etc. This describtion
	 * whill be used as a `Diagnostic.code`.
	 */
	type: string;
	/**
	 * The identifier is an Regular expression
     * that filters out the usefull bit's of text
     * that will be examined for any possible
     * Web Accessibility violations.
	 * 
	 * The first capture groep will be used.
	 */
	identifier: RegExp;
	/**
	 * The severity defines which type of error
	 * will be shown when an "oepsie" is found.
	 * See {@link Severity}
	 */
	severity: Severity;
	/**
	 * The messages contains the actuale warning
	 * that explains what exactly went wrong. 
	 */
	message: string;
	/**
	 * The filters contains an array of type
	 * `Filter`. 
	 * See {@link Filter}
	 */
	filters?: Filter[];
}
/**
 * Filter holds an other indentifier
 * that filters using the first capture group
 * provide by the entry `intentifier`. There are
 * multiple options that tells exactly what needs
 * to be done with the `RegExp`.
 * See {@link Option}
 */
export interface Filter {
	/**
	 * The identifier within the `Filter` is 
	 * the follow up `RegExp` that needs to be
	 * used to find the core problem with some
	 * Web Accessibilty rules.
	 * 
	 * The first capture groep will be used.
	 */
	identifier: RegExp;
	/**
	 * The options contains possible modifiers
	 * on how to execute the `RegExp`.
	 * See {@link Option} 
	 */
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

export declare namespace Type {
	const SEMANTIC: 'Semantic';
	const MISSING:	'Missing';
	const DUPLICANT: 'Duplicant';
}