Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'node.js',
  },
  writable: true,
})
