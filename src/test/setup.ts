import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { resetDb } from '../api/db';
import { simulation } from '../api/simulation';

// The simulated API should answer instantly in tests.
simulation.latency = { min: 0, max: 0 };

// jsdom does not implement the modal <dialog> API yet, so tests get a minimal
// stand-in. Focus trapping and the backdrop are browser behaviour and are
// checked manually, not here.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

// jsdom has no layout, so scrolling is a no-op there.
window.scrollTo = () => {};

beforeEach(() => {
  // Every test starts from the same seed data and a healthy API.
  resetDb();
  simulation.setFailRequests(false);
});

afterEach(() => {
  cleanup();
});
