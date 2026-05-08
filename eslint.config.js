import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
    // Base JS rules
    js.configs.recommended,

    // TypeScript rules (with type-checking)
    ...tseslint.configs.recommendedTypeChecked,

    // React rules
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: {
            react,
            'react-hooks': reactHooks,
            import: importPlugin,
            prettier,
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: { jsx: true },
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                ...globals.browser,
                ...globals.es2022,
            },
        },
        settings: {
            react: { version: 'detect' },
            'import/resolver': {
                typescript: { project: './tsconfig.json' },
            },
        },
        rules: {
            // React
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,
            'react/prop-types': 'off',
            'react/no-array-index-key': 'error',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error',

            // TypeScript
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',

            // Imports
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                    pathGroups: [
                        { pattern: '@app/**', group: 'internal', position: 'before' },
                        { pattern: '@features/**', group: 'internal', position: 'before' },
                        { pattern: '@shared/**', group: 'internal', position: 'before' },
                        { pattern: '@pages/**', group: 'internal', position: 'before' },
                    ],
                    pathGroupsExcludedImportTypes: ['builtin'],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
            'import/no-cycle': 'error',
            'import/no-self-import': 'error',

            // Feature boundaries
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@features/*/!(index)', '@features/*/!(index)/**'],
                            message:
                                "Import from a feature's public API (its index.ts), not its internals.",
                        },
                    ],
                },
            ],

            // Prettier integration
            'prettier/prettier': 'error',
        },
    },

    // Prettier — turn off conflicting formatting rules. Must be last.
    prettierConfig,

    // Ignores (replaces .eslintignore)
    {
        ignores: ['dist/**', 'node_modules/**', 'webpack/**', '*.config.js', '*.config.cjs'],
    },
];