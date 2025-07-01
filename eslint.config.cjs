// eslint.config.cjs
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const eslintrc = require('./.eslintrc.json');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = [
  ...compat.config(eslintrc),
  {
    rules: {
      '@typescript-eslint/no-var-requires': 'off'
    }
  }
];