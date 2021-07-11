module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    "quote-props": "off",
    "no-undef": "error",
    "no-unused-vars": "error",
    "no-inner-declarations": ["error"],
    "camelcase": "warn",
    "curly": "warn",
    "no-undef-init": "warn",
    "no-constant-condition": "warn",
    "no-console": ["warn", {
      "allow": ["time", "timeEnd", "info", "error", "warn"]
    }],
    "linebreak-style": [
      "warn",
      "unix"
    ],
    "one-var": "warn",
    "new-cap": "warn",
    "quotes": [
      "off",
      "double"
    ],
    "semi": [
      "warn",
      "always"
    ],
    "prefer-promise-reject-errors": ["warn", { "allowEmptyReject": true }],
    "promise/param-names": ["warn"],
    "no-unmodified-loop-condition": ["warn"],
    "no-useless-escape": ["warn"],
    "eol-last": ["warn"],
    "space-before-function-paren": ["off", {
      "anonymous": "ignore",
      "named": "always",
      "asyncArrow": "ignore"
    }],
    "comma-dangle": ["error", {
      "arrays": "only-multiline",
      "objects": "only-multiline",
      "imports": "never",
      "exports": "never",
      "functions": "ignore"
    }],
    "indent": "off",
    "no-multi-spaces": "off",
    "no-trailing-spaces": "error",
    "handle-callback-err": "error",
    "spaced-comment": "off",
    "object-property-newline": "off",
    "object-curly-spacing": "off",
    "no-template-curly-in-string": "off",
    "no-unneeded-ternary": "off",
    "no-return-assign": "off",
    "eqeqeq": "off",
    "operator-linebreak": "error",
    "space-infix-ops": "off",
    "no-mixed-operators": "off",
    "space-unary-ops": "off",
    "keyword-spacing": "error",
    "no-unreachable": "off",
    "standard/array-bracket-even-spacing": "off",
    "yoda": "error"
  }
};
