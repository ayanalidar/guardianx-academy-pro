import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // === TypeScript rules — re-enabled ===
    // Most of these were disabled wholesale during initial development. We're
    // turning them back on as warnings so existing code doesn't break the
    // build, but new code is expected to be clean. Promote to "error" once
    // the codebase is cleaned up.
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-non-null-assertion": "off", // widespread in shadcn/ui code
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",

    // === React rules ===
    // exhaustive-deps: warn (not error) because there are many existing
    // intentional single-fire effects. Promote to error in a follow-up.
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/purity": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",

    // === Next.js rules ===
    "@next/next/no-img-element": "off", // we use plain <img> in many places intentionally
    "@next/next/no-html-link-for-pages": "off",

    // === General JavaScript rules — re-enabled ===
    "prefer-const": "warn",
    "no-unused-vars": "off", // handled by @typescript-eslint/no-unused-vars
    "no-console": [
      "warn",
      { allow: ["warn", "error", "info"] },
    ],
    "no-debugger": "error",
    "no-empty": "warn",
    "no-irregular-whitespace": "warn",
    "no-case-declarations": "off",
    "no-fallthrough": "error",
    "no-mixed-spaces-and-tabs": "error",
    "no-redeclare": "off", // handled by TypeScript
    "no-undef": "off", // handled by TypeScript
    "no-unreachable": "error",
    "no-useless-escape": "warn",
  },
}, {
  ignores: [
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "examples/**",
    "skills/**",
    "agent-ctx/**",
    "tool-results/**",
    "download/**",
    "upload/**",
    "mini-services/**/node_modules/**",
  ],
}];

export default eslintConfig;
