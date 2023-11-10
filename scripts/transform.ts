#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-var-requires
const StyleDictionary = require('style-dictionary').extend('config.json5');

import {
	Dictionary,
	File,
	TransformedToken,
	TransformedTokens,
} from 'style-dictionary';
const { fileHeader, getTypeScriptType } = StyleDictionary.formatHelpers;

StyleDictionary.registerFormat({
	name: 'javascript/esm',
	formatter: ({ dictionary, file }: { dictionary: Dictionary; file: File }) => {
		const newTokens = createTokensObject(dictionary);

		let result = fileHeader({ file });

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
	formatter: ({ dictionary, file }: { dictionary: Dictionary; file: File }) => {
		const newTokens = createTokensObject(dictionary, true);

		let result = fileHeader({ file });

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
 * Remove the 'default' path from the tokens and strip the
 * tokens from everything except `value`
 */
function createTokensObject(
	dictionary: Dictionary,
	isTSDeclaration: boolean = false,
): Dictionary {
	return dictionary.allTokens.reduce((acc: any, token: TransformedToken) => {
		const newPath = token.path.filter((pathPart) => pathPart !== '_');
		return addTokenToObject(acc, newPath, token, isTSDeclaration);
	}, {});
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

StyleDictionary.buildAllPlatforms();
