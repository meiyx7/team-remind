// eslint.config.js 微信小程序原生 JS 检查配置
const js = require('@eslint/js')

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'miniprogram_npm/**',
      'supabase/**',
      // 生成物不参与 lint（来源 scripts/gen-*.js）
      'miniprogram/utils/icons.js',
      'miniprogram/custom-tab-bar/index.js',
      'uploads/**'
    ]
  },
  js.configs.recommended,
  {
    // Node 脚本（构建 / 代码生成 / CI 上传）
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Promise: 'readonly',
        Math: 'readonly',
        JSON: 'readonly',
        Date: 'readonly',
        String: 'readonly',
        Number: 'readonly',
        Object: 'readonly'
      }
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // 小程序运行时
        wx: 'readonly',
        getApp: 'readonly',
        getCurrentPages: 'readonly',
        Page: 'readonly',
        App: 'readonly',
        Component: 'readonly',
        Behavior: 'readonly',
        // 标准库 / 运行环境
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Promise: 'readonly',
        Math: 'readonly',
        JSON: 'readonly',
        Date: 'readonly',
        Array: 'readonly',
        Object: 'readonly',
        String: 'readonly',
        Number: 'readonly',
        Boolean: 'readonly',
        RegExp: 'readonly',
        Error: 'readonly',
        isNaN: 'readonly',
        parseInt: 'readonly',
        parseFloat: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error'
    }
  }
]
