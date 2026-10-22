import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white';
const CLASS_STRING = `:matches(JSXAttribute[name.name='className'], CallExpression[callee.name='cn'])`;

const domLookups = [
  'getElementById',
  'querySelector',
  'querySelectorAll',
  'getElementsByClassName',
].map((property) => ({ object: 'document', property, message: 'Use useRef instead.' }));

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/coverage/**',
      '**/dist/**',
      'apps/web/src/paraglide/**',
      'apps/web/src/routeTree.gen.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-extraneous-class': ['error', { allowStaticOnly: true }],
      // Props are always a named interface, even when it only extends another type.
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
      'no-console': 'error',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-properties': ['error', ...domLookups],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > TemplateLiteral",
          message: 'Compose class names with cn().',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > ConditionalExpression",
          message: "Use cn() with `cond && 'class'` or `{ class: cond }`.",
        },
        {
          selector: `${CLASS_STRING} Literal[value=/#[0-9a-fA-F]{3,8}\\b|\\b(bg|text|border|ring|fill|stroke|from|via|to|outline|divide|shadow)-(${PALETTE})(-\\d{2,3})?\\b/]`,
          message: 'Use a semantic theme token (bg-primary, text-muted-foreground) from theme.css.',
        },
      ],
    },
  },
  {
    files: ['**/scripts/**'],
    rules: { 'no-console': 'off' },
  },
);
