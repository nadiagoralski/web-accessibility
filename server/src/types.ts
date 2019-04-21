/**
 * A Rule defines how a Web Accessibility rule is
 * written in a `JSON` and interpreted within the language server.
 */
export interface Rule {
	/**
     * The type describes what kind of rule it's 
     * going to implement for example `Semantic`,
     *  `Missing`, `Duplicate` etc. This description
     * will be used as a `Diagnostic.code`.
	 */
	type: string;
	/**
     * The identifier is a Regular expression
     * that filters out the useful bit's of text
     * that will be examined for any possible
     * Web Accessibility violations.
     * 
     * The first capture group will be used.
	 */
	identifier: string[];
	/**
     * The severity defines which type of error
     * will be shown when an "oopsie" is found.
	 */
	severity: number;
	/**
     * The messages contain the actual warning
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
 * Filter holds the other identifier
 * that filters using the first capture group
 * provided by the entry `identifier`. There are
 * multiple options that tell exactly what needs
 * to be done with the `RegExp`.
 * See {@link Option}
 */
export interface Filter {
	/**
     * The identifier within the `Filter` is 
     * the follow up `RegExp` that needs to be
     * used to find the core problem with some
     * Web Accessibility rules.
     * 
     * The first capture group will be used.
	 */
	identifier: string;
	/**
	 * The options contains possible modifiers
	 * on how to execute the `RegExp`.
	 * See {@link Option} 
	 */
	options?: Option;
}
/**
 * Options defines which types of modifiers
 * are possible to use with `RegExp`.
 */
export interface Option {
	/**
     * The negative modifier reverse the filter
     * if a value isn't there give an error.
     * there is no follow up filter as it has 
	 * no capturing group.
	 */
	negative?: boolean;
	/**
	 * This is the default behaviour for
	 * `/stringToFind/i.test(RegExpFilter)`
	 * and returns true of false.
	 */
	contains?: boolean;
	/**
     * Replace changes the filtered string
     * but keeps the index the same.
     * TODO: more replace options.
	 */
	replace?: boolean;
}
/**
 * Types are short explanations for what type of 
 * error there is in the code. It's used as an error code
 * and used to exclude as a filter parameter for a file,
 * for example, you don't want any error's for semantic HTML
 * you can omit `semantic` and it will be excluded by the filter.
 */
export declare namespace Type {
	const Semantic: 'Semantic';
	const Missing:	'Missing';
	const Duplicate: 'Duplicate';
}
