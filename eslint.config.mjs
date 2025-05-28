import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// This part loads the Next.js recommended ESLint configuration
// `compat.extends(...)` returns an array of flat config objects.
const nextJsConfigs = compat.extends("next/core-web-vitals");

// This is your new configuration object for custom rules
const customRulesConfig = {
  // You can optionally specify which files these rules apply to.
  // If you leave `files` out, the rules apply more globally,
  // but the Next.js config likely already scopes things.
  // For JS/JSX files specifically:
  // files: ["**/*.js", "**/*.jsx", "**/*.mjs"],
  rules: {
    // Your desired 'no-unused-vars' rule
    "no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_", // Ignore unused function arguments starting with _
        varsIgnorePattern: "^_", // Ignore unused variables starting with _
        caughtErrorsIgnorePattern: "^_ignored", // Ignore unused caught error variables starting with _ignored
      },
    ],

    // Regarding react/prop-types and react/react-in-jsx-scope:
    // Next.js (especially with its modern JSX transform) usually handles
    // 'react/react-in-jsx-scope' correctly (it's often not needed).
    // 'react/prop-types' is off by default in many Next.js setups if not using TypeScript.
    //
    // Only add these lines if you are actually getting linting errors for them
    // and want to explicitly turn them off:
    // 'react/prop-types': 'off',
    // 'react/react-in-jsx-scope': 'off',
  },
  // If you ever needed to define globals (though Next.js handles React for JSX well):
  // languageOptions: {
  //   globals: {
  //     React: "readonly", // Not usually needed for Next.js JSX
  //   },
  // },
};

// Combine the Next.js configs with your custom rules config
const eslintConfig = [
  ...nextJsConfigs, // Spread the array of configs from Next.js
  customRulesConfig, // Add your custom rules object
];

export default eslintConfig;
