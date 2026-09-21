// Design-system lint: @shadcn/lint, pointed at the files that actually carry
// Tailwind classes. This project's UI is Svelte, so the linter needs two things
// upstream does not ship together:
//
//   1. svelte-eslint-parser, so `.svelte` markup is parsed at all. Oxlint, the
//      linter @shadcn/lint's setup guide suggests when a project has neither
//      ESLint nor Oxlint, has no Svelte parser (oxc-project/oxc#8171), so ESLint
//      is the only host that can read these files.
//   2. A patch teaching the plugin to read a Svelte class attribute
//      (`patches/@shadcn__lint@0.1.5.patch`). Unpatched, it reads JSX
//      `className` attributes only and silently reports nothing in a `.svelte`
//      file. The patch is additive: JSX behaviour is untouched. Delete it and
//      drop `svelte-eslint-parser`/`@typescript-eslint/parser` once upstream
//      supports Svelte.
//
// No rules are enabled on purpose — a policy is the project's decision, not a
// setup default. The rules this design system is set up to use are listed below.
import { plugin as shadcn } from '@shadcn/lint';
import tsParser from '@typescript-eslint/parser';
import svelteParser from 'svelte-eslint-parser';

export default [
  {
    ignores: ['build/', 'out/', 'dist/', '.svelte-kit/', '.vite/', 'node_modules/']
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: tsParser }
    },
    plugins: { shadcn },
    settings: {
      shadcn: {
        // Appended to every finding, so an agent that trips a rule is sent to
        // the system of record rather than guessing at the intent.
        note: 'See DESIGN.md for this design system, its rules and its approved exceptions.'
      }
    },
    rules: {
      // Enabled: this design system's guard rails. Each maps to a rule in
      // DESIGN.md, and each error names the token or class to use instead.
      //
      // The Four Tones Rule — fills come from --color-ff-* tokens.
      'shadcn/no-raw-colors': 'error',
      // The Twelve Floor Rule — sizes come from the --text-* scale.
      'shadcn/no-arbitrary-values': 'error',
      // Classes must be real: a Tailwind utility, or one of the components
      // declared in src/styles/global.css.
      'shadcn/no-unknown-classes': 'error',
      // A class name an agent cannot read is a class name it cannot verify.
      'shadcn/require-static-classes': 'error'

      // Deliberately absent:
      // `shadcn/no-inline-styles` is still blind to Svelte `style` attributes
      // (the patch covers class attributes only), and enabling a rule that
      // silently checks nothing is the failure this patch exists to fix.
      // `shadcn/no-restyle` governs component APIs that accept className;
      // this project has no such component library.
    }
  }
];
