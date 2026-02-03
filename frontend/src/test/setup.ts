/**
 * Test setup file for Vitest.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers and cleanup React after each test
// Using multiple async ticks to ensure React's scheduler completes all pending work
// before jsdom teardown. React uses setImmediate for scheduling which can cause
// "window is not defined" errors if work runs after test cleanup.
afterEach(async () => {
  cleanup();
  server.resetHandlers();
  // Flush all microtasks and scheduled macrotasks
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 0));
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollTo
window.scrollTo = () => {};

// Mock getComputedStyle for Ant Design table components
// JSDOM doesn't fully implement getComputedStyle, so we provide a complete mock
Object.defineProperty(window, 'getComputedStyle', {
  value: (element: Element) => ({
    getPropertyValue: (_prop: string) => '',
    getPropertyPriority: () => '',
    item: () => '',
    length: 0,
    parentRule: null,
    cssFloat: '',
    cssText: '',
    // Common properties needed by Ant Design
    display: element?.tagName === 'TABLE' ? 'table' : 'block',
    width: '100px',
    height: '100px',
    overflow: 'visible',
    overflowX: 'visible',
    overflowY: 'visible',
    boxSizing: 'border-box',
    position: 'relative',
    [Symbol.iterator]: function* () { yield* []; },
  }),
});
