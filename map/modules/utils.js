/**
 * debounce(fn, delay)
 * Utility to wrap a function so it only executes after `delay` ms have
 * elapsed since the last call. Useful for limiting expensive operations
 * like filtering and re-rendering while typing.
 *
 * Contract:
 *  - returns a function that forwards arguments to `fn` after `delay` ms
 *  - subsequent calls within the delay window reset the timer
 *
 * Edge cases:
 *  - This simple implementation does not support `cancel` or `flush`.
 *  - If you need those features, consider a small debounce library or
 *    implement those methods on the returned function.
 *
 * @param {Function} fn - function to debounce
 * @param {number} delay - milliseconds to wait after last call
 * @returns {Function} debounced wrapper
 */

export function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
