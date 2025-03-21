import { fileHeader, getTypeScriptType } from 'style-dictionary/utils';

import StyleDictionary, {
	Dictionary,
	File,
	TransformedToken,
	TransformedTokens,
} from 'style-dictionary';

const sd = new StyleDictionary('config.json5');

const USELESS_TOKENS = [
	'textDecoration',
	'fontFamily',
	'fontStyle',
	'fontStretch',
	'letterSpacing',
	'paragraphIndent',
	'paragraphSpacing',
];

// We use a prefix to differentiate our tokens from MUI's ones
const TOKEN_PREFIX = 'b';

const BASE_FONT_SIZE = 14;

StyleDictionary.registerFormat({
	name: 'javascript/esm',
	format: async ({
		dictionary,
		file,
	}: {
		dictionary: Dictionary;
		file: File;
	}) => {
		const newTokens = flattenDefaultTokens(dictionary.allTokens);

		let result = await fileHeader({ file });

		// split the tokens into categories so they're exported separately
		Object.keys(newTokens).forEach((tokenKey) => {
			result += `export const ${tokenKey} = ${JSON.stringify(
				newTokens[tokenKey],
				null,
				2,
			)};\n\n`;
		});

		// Add a default export with all the token categories
		result += `export default {\n${Object.keys(newTokens).join(',\n')}};`;

		return result;
	},
});

StyleDictionary.registerFormat({
	name: 'typescript/esm-declarations',
	format: async ({
		dictionary,
		file,
	}: {
		dictionary: Dictionary;
		file: File;
	}) => {
		const newTokens = flattenDefaultTokens(dictionary.allTokens, true);

		let result = await fileHeader({ file });

		// split the tokens into categories so they're exported separately
		Object.keys(newTokens).forEach((tokenKey) => {
			result += `export const ${tokenKey}: ${JSON.stringify(
				newTokens[tokenKey],
				null,
				2,
			)};\n\n`;
		});

		// TODO find a smarter way to remove quotes, this is fragile.
		return result.replace(/"/g, '');
	},
});

/**
 * Flat object of variables to use in MUI color attributes.
 *
 * The difference with the `javascript/esm` transform is that we flatten the
 * objects using dashes as separators. The reason we do that is that we want
 * to remove the `.value` suffix for a more intuitive usage.
 *
 * Example use: `<MuiButton bgcolor="bg-accent" />`
 */
StyleDictionary.registerFormat({
	name: 'javascript/mui-theme',
	format: async ({
		dictionary,
		file,
	}: {
		dictionary: Dictionary;
		file: File;
	}) => {
		const newTokens = flattenForMUI(dictionary.allTokens);

		let result = await fileHeader({ file });

		Object.keys(newTokens).forEach((tokenKey) => {
			result += `export const ${tokenKey} = ${JSON.stringify(
				newTokens[tokenKey],
				null,
				2,
			)};\n\n`;
		});

		// Add a default export with all the token categories
		result += `export default {\n${Object.keys(newTokens).join(',\n')}};`;

		return result;
	},
});

StyleDictionary.registerFormat({
	name: 'typescript/mui-theme-declaration',
	format: async ({
		dictionary,
		file,
	}: {
		dictionary: Dictionary;
		file: File;
	}) => {
		const newTokens = flattenForMUI(dictionary.allTokens);

		let result = await fileHeader({ file });

		// Types
		Object.keys(newTokens).forEach((tokenKey) => {
			result += `export type ${capitalize(tokenKey)}TokensType = {
					[K in keyof typeof ${tokenKey}]: (typeof ${tokenKey})[K];
				};`;
		});

		Object.keys(newTokens).forEach((tokenKey) => {
			result += `export const ${tokenKey} = {${Object.keys(
				newTokens[tokenKey],
			).map((token) => {
				return `'${token}': ${getTypeScriptType(newTokens[tokenKey][token])}`;
			})}};`;
		});

		// Add a default export with all the token categories
		// result += `export default {\n${Object.keys(newTokens).join(',\n')}};`;

		return result;
	},
});

StyleDictionary.registerFormat({
	name: 'json/flat-with-references',
	format: async function ({ dictionary }) {
		return JSON.stringify(dictionary.allTokens, null, 2);
	},
});

StyleDictionary.registerFilter({
	name: 'remove-useless-tokens',
	filter: (token: TransformedToken) => {
		if (token.attributes?.category !== 'typography') {
			return true;
		}

		const lastItem = token.path.slice(-1)[0];
		return !USELESS_TOKENS.includes(lastItem);
	},
});

StyleDictionary.registerTransform({
	name: 'custom/pxToRem',
	type: 'value',
	filter: (token: TransformedToken) =>
		token.path.slice(-1)[0] === 'fontSize' ||
		token.path.slice(-1)[0] === 'lineHeight',
	transform: (token: TransformedToken) => {
		return `${pxToBaseSize(token.value)}rem`;
	},
});

/**
 * Remove the 'default' path from the tokens and strip the
 * tokens from everything except `value`
 */
export function flattenDefaultTokens(
	tokens: TransformedToken[],
	isTSDeclaration: boolean = false,
): TransformedTokens {
	return tokens.reduce((acc: any, token: TransformedToken) => {
		const newPath = token.path.filter((pathPart) => pathPart !== '_');
		return addTokenToObject(acc, newPath, token, isTSDeclaration);
	}, {});
}

type FlatTokens = {
	[key: string]: { [key: string]: string };
};

export function flattenForMUI(tokens: TransformedToken[]) {
	const newTokens: FlatTokens = {};

	tokens.forEach((token) => {
		const category = token.path[0];

		// Filter out the palette, we don't want to expose it in MUI attributes
		if (category === 'color' && token.path.includes('palette')) {
			return;
		}

		// Remove the default paths (`color.bg._` becomes `color.bg`)
		const filteredPath = token.path.filter((path) => path !== '_');
		const tokenName = `${TOKEN_PREFIX}-${filteredPath.slice(1).join('-')}`;

		newTokens[category] ??= {};

		newTokens[category][tokenName] = token.value;
	});

	return newTokens;
}

/**
 * Add token to the object based on the path
 */
function addTokenToObject(
	obj: TransformedTokens,
	path: string[],
	token: TransformedToken,
	isTSDeclaration: boolean = false,
): TransformedTokens {
	let currentObj: TransformedTokens | TransformedToken = obj || {};

	for (let i = 0; i < path.length; i++) {
		currentObj[path[i]] = currentObj[path[i]] || {};

		currentObj = currentObj[path[i]];

		if (i === path.length - 1) {
			currentObj.value = isTSDeclaration
				? getTypeScriptType(token.value)
				: token.value;
			currentObj.name = isTSDeclaration ? 'string' : token.name;
		}
	}

	return obj;
}

export function pxToBaseSize(value: number, decimals = 3) {
	return (value / BASE_FONT_SIZE).toLocaleString('en', {
		maximumFractionDigits: decimals,
	});
}

const capitalize = <T extends string>(s: T) =>
	(s[0].toUpperCase() + s.slice(1)) as Capitalize<typeof s>;

await sd.buildAllPlatforms();
