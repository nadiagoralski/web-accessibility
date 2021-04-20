/*! accessibilityPatterns.ts
 * Flamingos are pretty badass!
 * Copyright (c) 2018 Max van der Schee; Licensed MIT */
// import {
// 	createConnection,
// 	ProposedFeatures
// } from 'vscode-languageserver';

// connection is used for debuging > connection.console.log();
// let connection = createConnection(ProposedFeatures.all);

import * as colorAccessibility from './accessible-colors/accessibility';
import * as colorPattern from './accessible-colors/accessibilityColorPatterns';

// Order based om most common types first
const patterns: string[] = [
	'<div(>|)(?:.)+?>',
	'<span(>|)(?:.)+?>',
	// "id=\"(?:.)+?\"",
	'<a (?:.)+?>(?:(?:\\s|\\S)+?(?=</a>))</a>',
	'<img (?:.)+?>',
	'<input (?:.)+?>',
	'<head (?:.|)+?>(?:(?:\\s|\\S|)+?(?=</head>))</head>',
	'<html(>|)(?:.)+?>',
	'tabindex="(?:.)+?"',
	'<(?:i|)frame (?:.|)+?>',
	'(([a-z0-9\\[\\]=:]+\\s?)|((div|span)?(#|\\.){1}[a-z0-9\\-_\\s?:]+\\s?)+)(\\{[\\s\\S][^}]*})',
];
export const pattern: RegExp = new RegExp(patterns.join('|'), 'ig');

const nonDescriptiveAlts: string[] = [
	'alt="image"',
	'alt="picture"',
	'alt="logo"',
	'alt="icon"',
	'alt="graphic"',
	'alt="an image"',
	'alt="a picture"',
	'alt="a logo"',
	'alt="an icon"',
	'alt="a graphic"',
];
const nonDescriptiveAltsTogether = new RegExp(nonDescriptiveAlts.join('|'), 'i');

const badAltStarts: string[] = [
	'alt="image of',
	'alt="picture of',
	'alt="logo of',
	'alt="icon of',
	'alt="graphic of',
	'alt="an image of',
	'alt="a picture of',
	'alt="a logo of',
	'alt="an icon of',
	'alt="a graphic of',
];
const badAltStartsTogether = new RegExp(badAltStarts.join('|'), 'i');

const cssPropPattern = {
	background: 'background:(\\w|\\d|\\s)*#([0-9a-f]{3}){1,2}(\\w|\\d|\\s)*;',
	color: 'color:(\\s)?#([0-9a-f]{3}){1,2};',
	fontSize: 'font-size:(\\s)?([0-9])+(px|pt);',
};
const cssPropRegEx = {
	background: new RegExp(cssPropPattern.background, 'i'),
	color: new RegExp(cssPropPattern.color, 'i'),
	fontSize: new RegExp(cssPropPattern.fontSize, 'i'),
};

export async function validateDiv(m: RegExpExecArray) {
	if (!/role=(?:.*?[a-z].*?)"/i.test(m[0])) {
		return {
			meta: m,
			mess: 'Use Semantic HTML5 or specify a WAI-ARIA role [role=""]',
			severity: 3,
		};
	}
}

export async function validateSpan(m: RegExpExecArray) {
	if (!/role=(?:.*?[a-z].*?)"/i.test(m[0])) {
		if (!/<span(?:.+?)(?:aria-hidden="true)(?:.+?)>/.test(m[0])) {
			if (/<span(?:.+?)(?:button|btn)(?:.+?)>/.test(m[0])) {
				return {
					meta: m,
					mess: 'Change the span to a <button>',
					severity: 3,
				};
			} else {
				return {
					meta: m,
					mess: 'Provide a WAI-ARIA role [role=""]',
					severity: 2,
				};
			}
		}
	}
}

export async function validateA(m: RegExpExecArray) {
	let aRegEx: RegExpExecArray;
	let oldRegEx: RegExpExecArray = m;
	let filteredString = m[0].replace(/<(?:\s|\S)+?>/gi, '');
	if (!/(?:\S+?)/gi.test(filteredString)) {
		aRegEx = /<a(?:.)+?>/i.exec(oldRegEx[0]);
		aRegEx.index = oldRegEx.index;
		return {
			meta: aRegEx,
			mess: 'Provide a descriptive text in between the tags',
			severity: 2,
		};
	}
}

export async function validateImg(m: RegExpExecArray) {
	// Ordered by approximate frequency of the issue
	if (!/alt="(?:.*?[a-z].*?)"/i.test(m[0]) && !/alt=""/i.test(m[0])) {
		return {
			meta: m,
			mess: 'Provide an alt text that describes the image, or alt="" if image is purely decorative',
			severity: 1,
		};
	}
	if (nonDescriptiveAltsTogether.test(m[0])) {
		return {
			meta: m,
			mess: 'Alt attribute must be specifically descriptive',
			severity: 3,
		};
	}
	if (badAltStartsTogether.test(m[0])) {
		return {
			meta: m,
			mess: 'Alt text should not begin with "image of" or similar phrasing',
			severity: 3,
		};
	}
	// Most screen readers cut off alt text at 125 characters.
	if (/alt="(?:.*?[a-z].*.{125,}?)"/i.test(m[0])) {
		return {
			meta: m,
			mess: 'Alt text is too long',
			severity: 1,
		};
	}
}

export async function validateMeta(m: RegExpExecArray) {
	let metaRegEx: RegExpExecArray;
	let oldRegEx: RegExpExecArray = m;
	if ((metaRegEx = /<meta(?:.+?)viewport(?:.+?)>/i.exec(oldRegEx[0]))) {
		metaRegEx.index = oldRegEx.index + metaRegEx.index;
		if (!/user-scalable=yes/i.test(metaRegEx[0])) {
			return {
				meta: metaRegEx,
				mess: 'Enable pinching to zoom [user-scalable=yes]',
				severity: 3,
			};
		}
		if (/maximum-scale=1/i.test(metaRegEx[0])) {
			return {
				meta: metaRegEx,
				mess: 'Avoid using [maximum-scale=1]',
				severity: 3,
			};
		}
	}
}

export async function validateTitle(m: RegExpExecArray) {
	let titleRegEx: RegExpExecArray;
	let oldRegEx: RegExpExecArray = m;
	if (!/<title>/i.test(oldRegEx[0])) {
		titleRegEx = /<head(?:|.+?)>/i.exec(oldRegEx[0]);
		titleRegEx.index = oldRegEx.index;
		return {
			meta: titleRegEx,
			mess: 'Provide a title within the <head> tags',
			severity: 1,
		};
	} else {
		titleRegEx = /<title>(?:|.*?[a-z].*?|\s+?)<\/title>/i.exec(oldRegEx[0]);
		if (/>(?:|\s+?)</i.test(titleRegEx[0])) {
			titleRegEx.index = oldRegEx.index + titleRegEx.index;
			return {
				meta: titleRegEx,
				mess: 'Provide a text within the <title> tags',
				severity: 1,
			};
		}
	}
}

export async function validateHtml(m: RegExpExecArray) {
	if (!/lang=(?:.*?[a-z].*?)"/i.test(m[0])) {
		return {
			meta: m,
			mess: 'Provide a language [lang=""]',
			severity: 2,
		};
	}
}

export async function validateInput(m: RegExpExecArray) {
	switch (true) {
		case /type="hidden"/i.test(m[0]):
			break;
		case /aria-label=/i.test(m[0]):
			if (!/aria-label="(?:(?![a-z]*?)|\s|)"/i.test(m[0])) {
				break;
			} else {
				return {
					meta: m,
					mess: 'Provide a text within the aria label [aria-label=""]',
					severity: 3,
				};
			}
		case /id=/i.test(m[0]):
			if (/id="(?:.*?[a-z].*?)"/i.test(m[0])) {
				let idValue = /id="(.*?[a-z].*?)"/i.exec(m[0])[1];
				let pattern: RegExp = new RegExp('for="' + idValue + '"', 'i');
				if (pattern.test(m.input)) {
					break;
				} else {
					return {
						meta: m,
						mess: 'Provide an aria label [aria-label=""] or a <label for="">',
						severity: 2,
					};
				}
			} else {
				return {
					meta: m,
					mess: 'Provide an aria label [aria-label=""]',
					severity: 2,
				};
			}
		case /aria-labelledby=/i.test(m[0]):
			if (!/aria-labelledby="(?:(?![a-z]*?)|\s|)"/i.test(m[0])) {
				// TODO: needs to check elements with the same value.
				break;
			} else {
				return {
					meta: m,
					mess: 'Provide an id within the aria labelledby [aria-labelledby=""]',
					severity: 1,
				};
			}
		case /role=/i.test(m[0]):
			// TODO: needs to check if <label> is surrounded.
			break;
		default:
			return {
				meta: m,
				mess: 'Provide an aria label [aria-label=""]',
				severity: 2,
			};
	}
}

export async function validateTab(m: RegExpExecArray) {
	if (!/tabindex="(?:0|-1)"/i.test(m[0])) {
		return {
			meta: m,
			mess: 'A tabindex greater than 0 interferes with the focus order. Try restructuring the HTML',
			severity: 1,
		};
	}
}

export async function validateFrame(m: RegExpExecArray) {
	if (!/title=(?:.*?[a-z].*?)"/i.test(m[0])) {
		return {
			meta: m,
			mess: 'Provide a title that describes the frame\'s content [title=""]',
			severity: 3,
		};
	}
}

export async function validateBody(m: RegExpExecArray, accessibilityLevel: string) {
	const isFontBold = /font-weight:(\s)?(bold);/i.test(m[0]);

	if (cssPropRegEx.background.test(m[0]) && cssPropRegEx.color.test(m[0])) {
		const backgroundColorProp = cssPropRegEx.background.exec(m[0])[0];
		const colorProp = cssPropRegEx.color.exec(m[0])[0];
		const fontSizeProp = cssPropRegEx.fontSize.exec(m[0])[0];

		// get values
		const backgroundColorValue = backgroundColorProp.match(/#([0-9a-f]{3}){1,2}/i)[0];
		const colorValue = colorProp.match(/#([0-9a-f]{3}){1,2}/i)[0];
		const fontSizeValue = fontSizeProp.match(/([0-9])+/)[1] || 18;
		const fontSizeUnit = fontSizeProp.match(/(pt|px)/) || 'px';
		// NOTE: accessible-colors only supports pt & px font units

		// get accessible contrast for font size, unit, and weight
		// calculate contrast using background color and text color
		const accessibleContrastRatio =
			colorAccessibility.accessibleContrast(accessibilityLevel, fontSizeValue, fontSizeUnit, isFontBold);
		const contrast = await colorPattern.contrast(backgroundColorValue, colorValue);

		if (contrast < accessibleContrastRatio) {
			// contrast less than accessible contrast ratio
			// determine new background and/or text colors recommendation(s)
			const newBackgroundColor =
				colorPattern.findClosestAccessibleColor(backgroundColorValue, colorValue, accessibleContrastRatio);
			const newTextColor =
				colorPattern.findClosestAccessibleColor(colorValue, backgroundColorValue, accessibleContrastRatio);

			if (newBackgroundColor || newTextColor) {
				// recommendation found
				let msg = `Fails SC 1.4.3: Contrast (Minimum)\n` +
				`Level: ${accessibilityLevel}.\n` +
				`Required contrast ratio: ${accessibleContrastRatio} Current contrast ratio: ${contrast}\n` +
				`To meet the minimum contrast ratio of ${accessibleContrastRatio}:\n`;


				if (newBackgroundColor) {
					// background color recommendation
					msg += `Change the background color to "${newBackgroundColor}"\n`;
				}
				if (newTextColor) {
					// text color recommendation
					msg += `Change the text color to "${newTextColor}"\n`;
				}

				return {
					meta: m,
					mess: msg,
					severity: 2,
				};
			}
		}
	}
}
// export async function validateId(m: RegExpExecArray) {
// 	let connection = createConnection(ProposedFeatures.all);
// 	let idValue = /id="(.*?[a-z].*?)"/i.exec(m[0])[1];
// 	let pattern: RegExp = new RegExp(idValue, 'i');
// 	// connection.console.log(idValue);
// 	if (pattern.exec(m.input).length == 2) {
// 		return {
// 			meta: m,
// 			mess: 'Duplicated id'
// 		};
// 	}
// }
