// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'storybook-static/**',
      '**/*.g.ts',
      'test-results/**',
      'test-results-visual/**',
      'playwright-report/**',
      'blob-report/**',
      '.lighthouseci/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strict,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'st', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'st', style: 'kebab-case' }],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
    },
  },
  {
    // The domain layer is plain TypeScript: no Angular, no RxJS, no DOM storage.
    files: ['libs/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@angular/*', 'rxjs', 'rxjs/*', '@ngrx/*'], message: 'libs/domain stays framework-free.' },
            { group: ['@seated/kit', '**/apps/**', '**/libs/kit/**'], message: 'The domain imports nothing above it.' },
          ],
        },
      ],
    },
  },
  {
    // The kit is presentational: it never reaches into the app or its stores.
    files: ['libs/kit/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/apps/**', '@ngrx/*'], message: 'The kit never imports the app or app state.' }] },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.stories.ts', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
