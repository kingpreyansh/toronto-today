import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
// jsdom has no scrolling viewport. Browser QA separately exercises navigation.
window.scrollTo = vi.fn();
afterEach(cleanup);
