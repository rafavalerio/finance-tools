import '@testing-library/jest-dom/vitest'

// Recharts' ResponsiveContainer requires ResizeObserver, which jsdom doesn't implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = global.ResizeObserver || ResizeObserverStub

// jsdom doesn't implement matchMedia. Default to "not matching" (mobile-first) so
// components using it (e.g. NavMenu's desktop/mobile switch) behave predictably; override
// per-test with `window.matchMedia = vi.fn().mockReturnValue({ ...matches: true... })` when a
// test needs the desktop branch.
window.matchMedia =
  window.matchMedia ||
  function matchMedia(query: string) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  }
