import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        exports: 'readonly',
        require: 'readonly',
      },
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    plugins: {
      import: importPlugin,
      '@stylistic': stylistic,
      prettier,
      '@typescript-eslint': tseslint,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off', // Handled by TypeScript
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Import order
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['sibling', 'parent'], 'index', 'unknown'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroups: [
            {
              group: 'internal',
              pattern: '@/**',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],

      // Line rules
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1, maxBOF: 0 }],
      '@stylistic/padded-blocks': ['error', 'never'],
      '@stylistic/lines-between-class-members': ['error', 'always'],

      // Enforce LF
      'linebreak-style': ['error', 'unix'],

      // Prettier integration (ESLint runs Prettier)
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'lf',
          semi: true,
          singleQuote: true,
          trailingComma: 'all',
          printWidth: 100,
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        process: 'readonly',
        console: 'readonly',
        exports: 'readonly',
        require: 'readonly',
      },
      ecmaVersion: 2021,
      sourceType: 'module',
    },
  },
];
