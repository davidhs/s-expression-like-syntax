import { assert } from "./utils.js";

import * as Syntax from "../src/syntax.js";


/**
 * 
 * @param {string} text 
 * @param {(string | (() => string))=} message_or_callback 
 */
function assert_is_ok(text, message_or_callback = "Assertion failed!") {
  const tokenization_result = Syntax.tokenize(text);

  assert(tokenization_result.ok, message_or_callback);
}


/**
 * 
 * @param {string} text 
 * @param {(string | (() => string))=} message_or_callback 
 */
function assert_is_not_ok(text, message_or_callback = "Assertion failed!") {
  const tokenization_result = Syntax.tokenize(text);

  assert(!tokenization_result.ok, message_or_callback);
}

function test_text_reconstruction() {
  // Custom test

  const text = `


  (let x 3)

  ; In the future I want to fix this...
  #|
  (let y (+ x 4))
  |#
  (let z (+ 2 3))

  ; Something something...

  #|#|

   Here I want to try out something


  asdf  |# |#


  (def x y)

`;

  const tokenization_result = Syntax.tokenize(text);
  assert(tokenization_result.ok);

  const { tokens } = tokenization_result;

  let reconstructed_text = "";

  for (const token of tokens.values()) {
    const lexeme = text.substring(token.index, token.index + token.length);
    reconstructed_text += lexeme;
  }

  assert(reconstructed_text === text, `Expected reconstructed text to equal the original text.
Original:
${text}

Reconstruction:
${reconstructed_text}`);

}


export function run_tests() {
  assert_is_ok("#|a#|b|#c|#");


  assert_is_not_ok("#|");
  assert_is_not_ok("#|#");
  assert_is_not_ok("#||");
  assert_is_not_ok("#|#|");
  assert_is_not_ok("#|#||");
  assert_is_not_ok("#|#||#");
  assert_is_not_ok("#|#||#|");

  assert_is_not_ok(`
  (let x 3)

  ; In the future I want to fix this...
  #|
  (let y (+ x 4))
  |#
  (let z (+ 2 3))

  ; Something something...

  #|

   Here I want to try out something

  | #


  (def x y)
  `);

  test_text_reconstruction();
}
