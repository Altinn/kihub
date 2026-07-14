import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// eslint-config-next 16 ships native flat configs — spread them directly. (The older
// FlatCompat(`compat.extends('next/core-web-vitals')`) path crashes under ESLint 9.39 +
// @eslint/eslintrc, which JSON.stringifies the config and hits a circular ref in the Next plugin.)
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'src/app/(payload)/**', 'src/payload-types.ts'] },
  ...nextCoreWebVitals,
];

export default config;
