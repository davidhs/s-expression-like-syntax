/// <reference path="utils.types.d.ts" />

/**
 * Asserts that a boolean expression is `true` at runtime.
 * 
 * Helper function
 * 
 * @param {boolean} condition Boolean expression.
 * @param {(string | (() => string))=} message_or_callback Error message or callback that returns an error message.
 * 
 * @throws
 */
function assertFn(condition, message_or_callback = "") {
  if (!condition) {
    if (typeof message_or_callback === "string") {
      const message = message_or_callback;

      throw new Error(`Assertion failed: ${message}`);
    } else {
      const callback = message_or_callback;

      const message = callback();

      throw new Error(`Assertion failed: ${message}`);
    }
  }
}

// HACK: this is a "hack" to get the type signature of the function declaration
// in "utils.types.d.ts" but binding the assertion function `assertFn`.

globalThis.assert = assertFn;

/** @type {assert} */
const assertFn2 = globalThis.assert;

export { assertFn2 as assert };
