import { expect, test } from 'vitest';
import { flattenDefaultTokens, pxToBaseSize } from '../scripts/transform';
import { TransformedToken } from 'style-dictionary';

const sampleTokens: TransformedToken[] = [
	{
		name: 'Background',
		path: ['color', 'bg', '_'],
		value: '#ffffff',
		isSource: false,
		original: null,
		filePath: '',
	},
	{
		name: 'BackgroundSubtle',
		path: ['color', 'bg', 'subtle'],
		value: '#eeeeee',
		isSource: false,
		original: null,
		filePath: '',
	},
	{
		name: 'Spacing',
		path: ['spacing', '_'],
		value: 16,
		isSource: false,
		original: null,
		filePath: '',
	},
];

test('Flatten default tokens', () => {
	expect(flattenDefaultTokens(sampleTokens)).toEqual({
		color: {
			bg: {
				name: 'Background',
				value: '#ffffff',
				subtle: {
					name: 'BackgroundSubtle',
					value: '#eeeeee',
				},
			},
		},
		spacing: {
			name: 'Spacing',
			value: 16,
		},
	});

	expect(flattenDefaultTokens(sampleTokens, true)).toEqual({
		color: {
			bg: {
				name: 'string',
				value: 'string',
				subtle: {
					name: 'string',
					value: 'string',
				},
			},
		},
		spacing: {
			name: 'string',
			value: 'number',
		},
	});

	expect(pxToBaseSize(40)).toEqual('2.857');
});
