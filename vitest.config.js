export default {
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'tests/mocks/**'],
    setupFiles: ['./tests/setup.js'],
    mockReset: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'scripts/',
        'server.js',
        'sw.js',
        '**/*.html'
      ]
    },
    testTimeout: 10000,
    restoreMocks: true
  }
};
