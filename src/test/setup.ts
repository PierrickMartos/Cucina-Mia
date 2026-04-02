import "@testing-library/jest-dom/vitest"
import "../i18n"

// jsdom does not implement IntersectionObserver
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver
