const browserGlobals = {
    window: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    localStorage: 'readonly',
    fetch: 'readonly',
    console: 'readonly',
    alert: 'readonly',
    confirm: 'readonly',
    prompt: 'readonly',
    URL: 'readonly',
    Blob: 'readonly',
    FileReader: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    Notification: 'readonly',
    AbortController: 'readonly',
    DOMParser: 'readonly',
    crypto: 'readonly',
    TextEncoder: 'readonly',
    marked: 'readonly',
};

const serviceWorkerGlobals = {
    self: 'readonly',
    caches: 'readonly',
    fetch: 'readonly',
    Promise: 'readonly',
    URL: 'readonly',
};

module.exports = [
    {
        files: ['script.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'script',
            globals: browserGlobals,
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-undef': 'error',
        },
    },
    {
        files: ['service-worker.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'script',
            globals: serviceWorkerGlobals,
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-undef': 'error',
        },
    },
];
