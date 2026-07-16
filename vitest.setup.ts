import '@testing-library/jest-dom/vitest'

// Recharts' ResponsiveContainer requires ResizeObserver, which jsdom doesn't implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = global.ResizeObserver || ResizeObserverStub
