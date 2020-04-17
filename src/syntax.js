/// <reference path="syntax.types.d.ts" />

////////////////////////////////////////////////////////////////////////////////
// A parser that parses text that looks like S-expressions, but note quite, and
// with a bunch of other extensions.
//
// v2020-04-17-163900
//
// ---------------
// List delimiters
// ---------------
// 
// Opening list delimiters are: (, [, and {.
//
// Closing list delimiters are: ), ], and }.
//
// ( needs to be matched with ), [ needs to be matched with ], and { needs to be
// matched with }.
// 
// ---------------------
// Single-quoted strings
// ---------------------
//
// A single-quoted string can span multiple lines.
//
// A single-quoted strings starts with `'` and ends with `'`.  To include the
// character `'` in the string then it must be escaped, and is escaped with `\`
// so to include `'` in the string you need to type `\'`.
//
// ---------------------
// Double-quoted strings
// ---------------------
//
// A double-quoted string can span multiple lines.
//
// A double-quoted strings starts with `"` and ends with `"`.  To include the
// character `"` in the string then it must be escaped, and is escaped with `\`
// so to include `"` in the string you need to type `\"`.
//
// -----------
// Raw strings
// -----------
//
// A raw string does NOT have escape characters.
//
// A raw string always starts with `#"`.  The raw string ends once it sees 
// another `"`.  What's different is if it starts with `#""` then it must end
// with `""`, and if it starts with `#"""` then it ends with `"""`.  So it
// starts with a octothorpe an n double quotes and ends with n double quotes.
//
// TODO: maybe implement in the future.  The syntax has not been determined.
//
// --------------------
// Single-line comments
// --------------------
//
// A single-line comment starts with `;`.
//
// -------------------
// Multi-line comments
// -------------------
//
// A multi-line comment starts with `#|` and ends with `|#`.
//
// A multi-line comment can nest.
//
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// Notes
//
// I use <https://play.rust-lang.org/> as a reference on how to write error 
// messages.
//
// The syntax of multi-line comments was chosen because of
// <https://docs.racket-lang.org/srfi/srfi-std/srfi-30.html>.
//
// At some point in the future comment out assertions, as they should NEVER fire
// given that the input is of the expected type.
//
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// Helper functions


/**
 * Asserts that a boolean expression is `true` at runtime.  Throws an exception
 * if `condition` is false (or fasly).
 * 
 * Use the `assert` variable instead of this function.
 * 
 * @param {boolean} condition Boolean expression.
 * @param {(string | (() => string))=} message_or_callback Error message or callback that returns an error message.
 * 
 * @throws if `condition` is false or `falsy`.
 */
function assert_function(condition, message_or_callback = "") {
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

/** 
 * HACK: this is a hack so I can get `assert` to behave like a TypeScript 
 * assertion function.  This is so I can use `assert(condition)` in my code and
 * get the same type checking I get when I would use
 * `if (!condition) throw new Error()`.
 * 
 * @type {declared_assert_function}
 */
const assert = assert_function;


/**
 * Helper function for unimplemented code that was not expected to need to be
 * implemented.
 * 
 * @param {string=} message 
 * @returns {never}
 * @throws
 */
function error_unexpected_unimplemented(message = "") {
  throw new Error(`Unexpected error: not implemented: ${message}`);
}


/**
 * Helper function for unexpected errors.
 * 
 * @param {string=} message 
 * @returns {never}
 * @throws
 */
function error_unexpected(message = "") {
  throw new Error(`Unexpected error: ${message}`);
}


////////////////////////////////////////////////////////////////////////////////
// Token types

/** @type {TokenTypeWhitespace} */
export const TOKEN_TYPE_WHITESPACE /************/ = 100;
/** @type {TokenTypeWord} */
export const TOKEN_TYPE_WORD /******************/ = 101;
/** @type {TokenTypeDoubleQuoteString} */
export const TOKEN_TYPE_DOUBLE_QUOTE_STRING /***/ = 102;
/** @type {TokenTypeSingleQuoteString} */
export const TOKEN_TYPE_SINGLE_QUOTE_STRING /***/ = 103;
/** @type {TokenTypeListDelimiterOpen} */
export const TOKEN_TYPE_LIST_DELIMITER_OPEN /***/ = 104;
/** @type {TokenTypeListDelimiterClose} */
export const TOKEN_TYPE_LIST_DELIMITER_CLOSE /**/ = 105;
/** @type {TokenTypeSingleLineComment} */
export const TOKEN_TYPE_SINGLE_LINE_COMMENT /***/ = 106;
/** @type {TokenTypeMultiLineComment} */
export const TOKEN_TYPE_MULTI_LINE_COMMENT /****/ = 107;

////////////////////////////////////////////////////////////////////////////////
// Different parse and tokenization modes.

const MODE_UNDETERMINED = 1; // base mode: default

const MODE_WHITESPACE = 2;

const MODE_WORD = 4;

const MODE_DOUBLE_QUOTE_STRING = 8;
const MODE_SINGLE_QUOTE_STRING = 16;

const MODE_SINGLE_LINE_COMMENT = 32;

const MODE_MULTI_LINE_COMMENT = 64;
const MODE_MULTI_LINE_COMMENT_START = 128;
const MODE_MULTI_LINE_COMMENT_END = 256;

////////////////////////////////////////////////////////////////////////////////
// Error codes

export const ERROR_CODE_UNEXPECTED_CLOSING_DELIMITER = 1;
export const ERROR_CODE_UNCLOSED_DELIMITER = 2;
export const ERROR_CODE_DELIM_MISMATCH = 4;
export const ERROR_CODE_UNTERMINATED_STRING = 8;
export const ERROR_CODE_UNTERMINATED_MULTI_LINE_COMMENT = 16;

////////////////////////////////////////////////////////////////////////////////

// Given an opening list delimiter this map should return the expected list
// closing delimiter.
/** @type {{[key: string]: string | undefined}} */
export const GET_CLOSE_VARIANT = {
  "(": ")",
  "{": "}",
  "[": "]",
};

////////////////////////////////////////////////////////////////////////////////


/**
 * A token should only contain information about what kind of token it is and
 * where it can be found in the text.
 */
export class Token {

  /**
   * @param {TokenType} type Type of token.
   * @param {number} index Index of token in text.
   * @param {number} length Length of token.
   * @param {number} line Line index of start of token in text.
   * @param {number} column Column index of start of token in text.
   */
  constructor(type, index, length, line, column) {
    this.type = type;
    this.index = index;
    this.length = length;
    this.line = line;
    this.column = column;

    /** @type {string} */
    this.value = "";
  }
}


export class ParseNodeList {

  /**
   * 
   * @param {ParseNodeTypeList} type 
   * @param {number} index 
   * @param {number} length 
   * @param {number} line 
   * @param {number} column 
   */
  constructor(type, index, length, line, column) {
    this.type = type;
    this.index = index;
    this.length = length;
    this.line = line;
    this.column = column;

    /** @type {ParseNode[]} */
    this.value = [];
  }
}

/**
 * 
 * @param {ParseNodeList} parse_node_list 
 * @param {ParseNode} child 
 */
function parse_node_list_add_child_length(parse_node_list, child) {
  parse_node_list.length += child.length;
}

/**
 * 
 * @param {ParseNodeList} parse_node_list 
 * @param {ParseNode} child 
 */
function parse_node_list_add_child(parse_node_list, child) {
  parse_node_list.length += child.length;
  parse_node_list.value.push(child);
}


/** @type {ParseNodeTypeList} */
export const PARSE_NODE_TYPE_LIST = 200;


/**
 * DO NOT CALL THIS FUNCTION EXCEPT FROM `to_simplified_parse_tree`.
 * 
 * @param {string} text 
 * @param {ParseNode} parse_node 
 * @param {boolean} include_comments 
 * @param {boolean} include_whitespace 
 * 
 * @returns {SimplifiedParseNode | null}
 */
function do_get_simplified_parse_node(text, parse_node, include_comments, include_whitespace) {
  if (parse_node.type === PARSE_NODE_TYPE_LIST) {
    // List

    const parse_tree = parse_node;

    const simplified_parse_tree = [];

    for (let i = 0; i < parse_tree.value.length; i += 1) {
      const sub_parse_node = parse_tree.value[i];

      const maybe_sub_parse_tree = do_get_simplified_parse_node(text, sub_parse_node, include_comments, include_whitespace);

      if (maybe_sub_parse_tree !== null) {
        const sub_parse_tree = maybe_sub_parse_tree;

        simplified_parse_tree.push(sub_parse_tree);
      }
    }

    return simplified_parse_tree;
  } else {
    // Token
    const token = parse_node;

    if (!include_whitespace && (token.type === TOKEN_TYPE_WHITESPACE)) {
      return null;
    } else if (!include_comments && (token.type === TOKEN_TYPE_SINGLE_LINE_COMMENT || token.type === TOKEN_TYPE_MULTI_LINE_COMMENT)) {
      return null;
    } else {
      const sub_text = text.substring(token.index, token.index + token.length);

      return sub_text;
    }
  }
}


/**
 * Constructs simplified parse trees from the input parse trees.
 * 
 * @param {string} text 
 * @param {ParseTree[]} parse_trees 
 * @param {boolean=} include_comments 
 * @param {boolean=} include_whitespace 
 * 
 * @returns {SimplifiedParseTree[]}
 */
export function to_simplified_parse_trees(text, parse_trees, include_comments = true, include_whitespace = true) {
  assert(typeof text === "string", "Text should be a string");
  assert(Array.isArray(parse_trees), "Parse trees should be an array of parse trees.");

  const parse_nodes = parse_trees;

  /** @type {SimplifiedParseTree[]} */
  const simplified_parse_trees = [];

  for (let i = 0; i < parse_nodes.length; i += 1) {
    const parse_node = parse_nodes[i];
    const simplified_parse_node = do_get_simplified_parse_node(text, parse_node, include_comments, include_whitespace);

    if (simplified_parse_node !== null) {
      simplified_parse_trees.push(simplified_parse_node);
    }
  }

  return simplified_parse_trees;
}


/**
 * Helper function to construct an error message.
 * 
 * TODO: Find a better name.
 * 
 * @param {string} text 
 * @param {number} text_index 
 * @param {number} line_index 
 * @param {number} column_index 
 * @param {number} error_code 
 * @param {string} error_message 
 * 
 * @returns {string}
 */
function create_error_message(text, text_index, line_index, column_index, error_code, error_message) {
  const lines = text.split("\n");
  const line = lines[line_index];

  const line_number = `${line_index + 1}`;
  const prepad = " ".repeat(line_number.length);

  const full_error_message = `error[${error_code}]:\n${prepad} |
${line_number} | ${line} 
${prepad} | ${" ".repeat(column_index)}^ ${error_message}`;

  return full_error_message;
}


/**
 * Tokenizes the text.
 * 
 * @param {string} text 
 * 
 * @returns {TokenizationResult}
 */
export function tokenize(text) {
  const text_length = text.length;

  let line_index = 0;
  let column_index = 0;

  /** @type {Token[]} */
  const tokens = [];

  /** @type {Token | null} */
  let token = null;

  // When tokenizing we are always in some mode.  The mode determines how we
  // tokenize at this point in time.
  let mode = MODE_UNDETERMINED;

  let multi_line_comment_nesting_level = 0;

  // In this loop we're walking over the text.
  for (let text_index = 0; text_index < text_length; text_index += 1) {
    const character = text[text_index + 0];

    let character_consumed = false;

    // Keep track of how often we repeat the character consumption loop.  If we
    // reach the limit then a logic error has occured.
    let character_consumption_loop_count = 0;
    const character_consumption_loop_limit = 2;

    // In this loop we're making a decision on how we're going to take our next
    // step when walking over the text.
    while (!character_consumed) {
      assert(character_consumption_loop_count <= character_consumption_loop_limit, `Could NOT consume character [${character}], loop limit reached!`);

      if (mode === MODE_UNDETERMINED) {
        assert(token === null, "token expected to be null.");
        assert(multi_line_comment_nesting_level === 0, "multi-line comment nesting expected to be 0.");

        if (character.match(/[([{]/) !== null) {
          // Opening list delimiter
          token = new Token(TOKEN_TYPE_LIST_DELIMITER_OPEN, text_index, 1, line_index, column_index);
          token.value = text.substring(token.index, token.index + token.length);
          tokens.push(token);
          token = null;
          mode = MODE_UNDETERMINED;
          character_consumed = true;
        } else if (character.match(/[)\]}]/) !== null) {
          // Closing list delimiter
          token = new Token(TOKEN_TYPE_LIST_DELIMITER_CLOSE, text_index, 1, line_index, column_index);
          token.value = text.substring(token.index, token.index + token.length);
          tokens.push(token);
          token = null;
          mode = MODE_UNDETERMINED;
          character_consumed = true;
        } else if (character.match(/\s/) !== null) {
          // Whitespace
          token = new Token(TOKEN_TYPE_WHITESPACE, text_index, 1, line_index, column_index);
          mode = MODE_WHITESPACE;
          character_consumed = true;
        } else if (character === ";") {
          // Single-line comment
          token = new Token(TOKEN_TYPE_SINGLE_LINE_COMMENT, text_index, 1, line_index, column_index);
          mode = MODE_SINGLE_LINE_COMMENT;
          character_consumed = true;
        } else if (character === "#" && text[text_index + 1] === "|") {
          // Nesting multi-line comment
          token = new Token(TOKEN_TYPE_MULTI_LINE_COMMENT, text_index, 1, line_index, column_index);
          mode = MODE_MULTI_LINE_COMMENT_START;
          character_consumed = true;
          multi_line_comment_nesting_level = 1;
        } else if (character === "|" && text[text_index + 1] === "#") {
          // Error: closing delimiter for nesting multi-line comments in an unexpected location.
          const error_code = ERROR_CODE_UNEXPECTED_CLOSING_DELIMITER;

          const error_message = create_error_message(text, text_index + 1, line_index, column_index + 1, error_code, "unexpected multi-line comment closing delimiter");

          return {
            ok: false,
            error_code: error_code,
            error_message: error_message,
          };
        } else if (character === "\"") {
          // Double-quote string
          token = new Token(TOKEN_TYPE_DOUBLE_QUOTE_STRING, text_index, 1, line_index, column_index);
          mode = MODE_DOUBLE_QUOTE_STRING;
          character_consumed = true;
        } else if (character === "'") {
          // Single-quote string
          token = new Token(TOKEN_TYPE_SINGLE_QUOTE_STRING, text_index, 1, line_index, column_index);
          mode = MODE_SINGLE_QUOTE_STRING;
          character_consumed = true;
        } else {
          // Word
          token = new Token(TOKEN_TYPE_WORD, text_index, 1, line_index, column_index);
          mode = MODE_WORD;
          character_consumed = true;
        }
      } else {
        assert(token !== null, `token expected not to be null.`);

        if (mode === MODE_WHITESPACE) {
          if (character.match(/\s/) !== null) {
            token.length += 1;
            character_consumed = true;
          } else {
            token.value = text.substring(token.index, token.index + token.length);
            tokens.push(token);
            token = null;
            mode = MODE_UNDETERMINED;
          }
        } else if (mode === MODE_WORD) {
          // NOTE: if you add another matcher for the start of a token type then
          // you must also include it here.
          if ((character.match(/\s/) !== null)
            || (character === ";")
            || (character === "#" && text[text_index + 1] === "|")
            || (character === "\"")
            || (character === "'")
            || (character.match(/[()[\]{}]/) !== null)
            || (character === "#" && text[text_index + 1] === "|")
            || (character === "|" && text[text_index + 1] === "#")) {
            // ...
            token.value = text.substring(token.index, token.index + token.length);
            tokens.push(token);
            token = null;
            mode = MODE_UNDETERMINED;
          } else {
            token.length += 1;
            character_consumed = true;
          }
        } else if (mode === MODE_DOUBLE_QUOTE_STRING) {
          if (character === "\"" && text[text_index - 1] !== "\\") {
            token.length += 1;
            token.value = text.substring(token.index, token.index + token.length);
            tokens.push(token);
            token = null;
            mode = MODE_UNDETERMINED;
            character_consumed = true;
          } else {
            token.length += 1;
            character_consumed = true;
          }
        } else if (mode === MODE_SINGLE_QUOTE_STRING) {
          if (character === "'" && text[text_index - 1] !== "\\") {
            token.length += 1;
            token.value = text.substring(token.index, token.index + token.length);
            tokens.push(token);
            token = null;
            mode = MODE_UNDETERMINED;
            character_consumed = true;
          } else {
            token.length += 1;
            character_consumed = true;
          }
        } else if (mode === MODE_SINGLE_LINE_COMMENT) {
          if (character === "\n") {
            token.length += 1;
            token.value = text.substring(token.index, token.index + token.length);
            tokens.push(token);
            token = null;
            mode = MODE_UNDETERMINED;
            character_consumed = true;
          } else {
            token.length += 1;
            character_consumed = true;
          }
        } else if (mode === MODE_MULTI_LINE_COMMENT_START) {
          assert(multi_line_comment_nesting_level > 0, "multi-lien comment nesting level expected to be greater than 0");
          assert(character === "|", `Expected | but got: ${character}`);

          // ...#|... (then go to MODE_MULTI_LINE_COMMENT)
          //     ^-- next character

          token.length += 1;
          character_consumed = true;
          mode = MODE_MULTI_LINE_COMMENT;

        } else if (mode === MODE_MULTI_LINE_COMMENT) {
          assert(multi_line_comment_nesting_level > 0);
          // ...#|... #| ... (change mode to MODE_MULTI_LINE_COMMENT_START)
          // ...#|... |# ... (change mode to MODE_MULTI_LINE_COMMENT_END)
          // ...#|... .. ... (keep current mode)
          //          ^-- next character

          token.length += 1;
          character_consumed = true;

          if (character === "#" && text[text_index + 1] === "|") {
            // ...#|... #| ... (change mode to MODE_MULTI_LINE_COMMENT_START)
            //          ^-- next character
            mode = MODE_MULTI_LINE_COMMENT_START;
            multi_line_comment_nesting_level += 1;
          } else if (character === "|" && text[text_index + 1] === "#") {
            // ...#|... |# ... (change mode to MODE_MULTI_LINE_COMMENT_END)
            //          ^-- next character
            mode = MODE_MULTI_LINE_COMMENT_END;
          }
        } else if (mode === MODE_MULTI_LINE_COMMENT_END) {
          assert(multi_line_comment_nesting_level > 0);

          // ...|#... (then go to MODE_MULTI_LINE_COMMENT or MODE_UNKNOWN)
          //     ^-- next character

          assert(character === "#", `Expected # but got: ${character}`);

          multi_line_comment_nesting_level -= 1;
          token.length += 1;
          character_consumed = true;

          if (multi_line_comment_nesting_level === 0) {
            token.value = text.substring(token.index, token.index + token.length);
            tokens.push(token);
            token = null;
            mode = MODE_UNDETERMINED;
          } else {
            mode = MODE_MULTI_LINE_COMMENT;
          }
        } else {
          error_unexpected_unimplemented(`mode: ${mode}`);
        }
      }

      character_consumption_loop_count += 1;
    }

    // Update line index and column index.
    if (character === "\n") {
      column_index = 0;
      line_index += 1;
    } else {
      column_index += 1;
    }
  }

  // Check if we've still got a work-in-progress token that needs to be handled.

  if (token !== null) {
    if (mode === MODE_UNDETERMINED) {
      error_unexpected("Mode should not be unknown if token is not null.");
    } else if (mode === MODE_WHITESPACE) {
      token.value = text.substring(token.index, token.index + token.length);
      tokens.push(token);
      token = null;
      mode = MODE_UNDETERMINED;
    } else if (mode === MODE_SINGLE_LINE_COMMENT) {
      token.value = text.substring(token.index, token.index + token.length);
      tokens.push(token);
      token = null;
      mode = MODE_UNDETERMINED;
    } else if (mode === MODE_DOUBLE_QUOTE_STRING) {
      // We forgot to close the string
      const error_code = ERROR_CODE_UNTERMINATED_STRING;

      /** @type {string[]} */
      const error_message = [];

      const lines = text.split("\n");

      const start_line = token.line;
      const start_column = token.column;

      const end_line = line_index;
      const end_column = column_index;

      let gutter_length = 0;
      gutter_length = Math.max(gutter_length, `${start_line + 1}`.length);
      gutter_length = Math.max(gutter_length, `${end_line + 1}`.length);
      gutter_length = Math.max(gutter_length, "...".length);

      const prepad = " ".repeat(gutter_length);

      if (start_line === end_line) {
        // 1 line

        error_message.push(`error[${error_code}]:\n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(start_column)}v-- start of double-quote string\n`);
        error_message.push(`${`${end_line + 1}`.padStart(gutter_length, " ")} | ${lines[end_line + 0]} \n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(end_column)}^-- unterminated double-quote string\n`);
      } else if (end_line - start_line <= 5) {
        // 2 - 5 lines
        error_message.push(`error[${error_code}]:\n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(start_column)}v-- start of double-quote string\n`);
        error_message.push(`${`${start_line + 1}`.padStart(gutter_length, " ")} | ${lines[start_line + 0]} \n`);

        // Middle lines
        for (let line = start_line + 1; line < end_line; line += 1) {
          error_message.push(`${`${line + 1}`.padStart(gutter_length, " ")} | ${lines[line + 0]} \n`);
        }

        error_message.push(`${`${end_line + 1}`.padStart(gutter_length, " ")} | ${lines[end_line + 0]} \n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(end_column)}^-- unterminated double-quote string\n`);
      } else {
        // +5 lines

        error_message.push(`error[${error_code}]:\n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(start_column)}v-- start of double-quote string\n`);
        error_message.push(`${`${start_line + 1}`.padStart(gutter_length, " ")} | ${lines[start_line + 0]} \n`);
        error_message.push(`${`${start_line + 2}`.padStart(gutter_length, " ")} | ${lines[start_line + 1]} \n`);
        error_message.push(`${"...".padStart(gutter_length, " ")} | ...\n`);
        error_message.push(`${`${end_line + 0}`.padStart(gutter_length, " ")} | ${lines[end_line - 1]} \n`);
        error_message.push(`${`${end_line + 1}`.padStart(gutter_length, " ")} | ${lines[end_line + 0]} \n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(end_column)}^-- unterminated double-quote string\n`);
      }

      return {
        ok: false,
        error_code: error_code,
        error_message: error_message.join(""),
      };
    } else if (mode === MODE_WORD) {
      token.value = text.substring(token.index, token.index + token.length);
      tokens.push(token);
      token = null;
      mode = MODE_UNDETERMINED;
    } else if (mode === MODE_MULTI_LINE_COMMENT) {
      // We forgot to close multi line comment
      const error_code = ERROR_CODE_UNTERMINATED_MULTI_LINE_COMMENT;

      /** @type {string[]} */
      const error_message = [];

      const lines = text.split("\n");

      const start_line = token.line;
      const start_column = token.column;

      const end_line = line_index;
      const end_column = column_index;

      let gutter_length = 0;

      // TODO: I also want to keep track of the last multi-line comment closing delimiter used!

      gutter_length = Math.max(gutter_length, `${start_line + 1}`.length);
      gutter_length = Math.max(gutter_length, `${end_line + 1}`.length);
      gutter_length = Math.max(gutter_length, "...".length);

      const prepad = " ".repeat(gutter_length);

      const nesting_message = `missing ${multi_line_comment_nesting_level} closing delimiter${multi_line_comment_nesting_level > 1 ? "s" : ""}`;

      if (start_line === end_line) {
        // 1 line

        error_message.push(`error[${error_code}]:\n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(start_column)}v-- start of multi-line comment\n`);
        error_message.push(`${`${end_line + 1}`.padStart(gutter_length, " ")} | ${lines[end_line + 0]} \n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(end_column)}^-- unterminated multi-line comment, ${nesting_message}\n`);
      } else if (end_line - start_line <= 5) {
        // 2 - 5 lines
        error_message.push(`error[${error_code}]:\n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(start_column)}v-- start of multi-line comment\n`);
        error_message.push(`${`${start_line + 1}`.padStart(gutter_length, " ")} | ${lines[start_line + 0]} \n`);

        // Middle lines
        for (let line = start_line + 1; line < end_line; line += 1) {
          error_message.push(`${`${line + 1}`.padStart(gutter_length, " ")} | ${lines[line + 0]} \n`);
        }

        error_message.push(`${`${end_line + 1}`.padStart(gutter_length, " ")} | ${lines[end_line + 0]} \n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(end_column)}^-- unterminated multi-line comment, ${nesting_message}\n`);
      } else {
        // +5 lines

        error_message.push(`error[${error_code}]:\n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(start_column)}v-- start of multi-line comment\n`);
        error_message.push(`${`${start_line + 1}`.padStart(gutter_length, " ")} | ${lines[start_line + 0]} \n`);
        error_message.push(`${`${start_line + 2}`.padStart(gutter_length, " ")} | ${lines[start_line + 1]} \n`);
        error_message.push(`${"...".padStart(gutter_length, " ")} | ...\n`);
        error_message.push(`${`${end_line + 0}`.padStart(gutter_length, " ")} | ${lines[end_line - 1]} \n`);
        error_message.push(`${`${end_line + 1}`.padStart(gutter_length, " ")} | ${lines[end_line + 0]} \n`);
        error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(end_column)}^-- unterminated multi-line comment, ${nesting_message}\n`);
      }

      return {
        ok: false,
        error_code: error_code,
        error_message: error_message.join(""),
      };
    } else {
      error_unexpected_unimplemented(`Leftover token: mode(${mode}): not implemented!`);
    }
  }

  assert(multi_line_comment_nesting_level === 0);
  assert(mode === MODE_UNDETERMINED, `Expected mode to be MODE_UNDETERMINED, but is: ${mode}`);
  assert(token === null, `Expected token to be null.`);

  return {
    ok: true,
    tokens: tokens,
  };
}


/**
 * Parses text in to parse trees.
 * 
 * A parse tree can consist of a single word, a list, or something else.
 * 
 * @param {string} text Text that will be parsed.
 * @param {boolean=} include_comments Default value is `true`.
 * @param {boolean=} include_whitespace Default value is `true`.
 * @param {boolean=} include_list_delimiters Default value is `true`.
 * 
 * @returns {ParseResult}
 */
export function parse(text, include_comments = true, include_whitespace = true, include_list_delimiters = true) {
  const tokenization_result = tokenize(text);

  if (!tokenization_result.ok) {
    return tokenization_result;
  }

  const { tokens } = tokenization_result;

  // List delimiter stack.  To keep track of visited opening list delimiters
  // that have not been closed.
  /** @type {Token[]} */
  const list_delim_stack = [];

  // This first stack element will be a temporary list.  At the end the children
  // of it will be treated as parse trees.
  /** @type {ParseNodeList[]} */
  const parse_node_list_stack = [new ParseNodeList(PARSE_NODE_TYPE_LIST, 0, 0, 0, 0)];


  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.type === TOKEN_TYPE_WHITESPACE) {
      if (include_whitespace) {
        parse_node_list_add_child(parse_node_list_stack[parse_node_list_stack.length - 1], token);
      } else {
        parse_node_list_add_child_length(parse_node_list_stack[parse_node_list_stack.length - 1], token);
      }
    } else if (token.type === TOKEN_TYPE_WORD || token.type === TOKEN_TYPE_DOUBLE_QUOTE_STRING || token.type === TOKEN_TYPE_SINGLE_QUOTE_STRING) {
      parse_node_list_add_child(parse_node_list_stack[parse_node_list_stack.length - 1], token);
    } else if (token.type === TOKEN_TYPE_LIST_DELIMITER_OPEN) {
      list_delim_stack.push(token);

      const parse_node_list = new ParseNodeList(PARSE_NODE_TYPE_LIST, token.index, 0, token.line, token.column);
      parse_node_list_stack.push(parse_node_list);

      if (include_list_delimiters) {
        parse_node_list_add_child(parse_node_list_stack[parse_node_list_stack.length - 1], token);
      } else {
        parse_node_list_add_child_length(parse_node_list_stack[parse_node_list_stack.length - 1], token);
      }
    } else if (token.type === TOKEN_TYPE_SINGLE_LINE_COMMENT || token.type === TOKEN_TYPE_MULTI_LINE_COMMENT) {
      if (include_comments) {
        parse_node_list_add_child(parse_node_list_stack[parse_node_list_stack.length - 1], token);
      } else {
        parse_node_list_add_child_length(parse_node_list_stack[parse_node_list_stack.length - 1], token);
      }
    } else if (token.type === TOKEN_TYPE_LIST_DELIMITER_CLOSE) {
      if (include_list_delimiters) {
        parse_node_list_add_child(parse_node_list_stack[parse_node_list_stack.length - 1], token);
      } else {
        parse_node_list_add_child_length(parse_node_list_stack[parse_node_list_stack.length - 1], token);
      }

      ////////////////////////////////////////////////
      // Check if we're closing too many delimiters //
      ////////////////////////////////////////////////

      if (list_delim_stack.length === 0) {
        // Error
        const error_code = ERROR_CODE_UNEXPECTED_CLOSING_DELIMITER;

        const error_message = create_error_message(text, token.index, token.line, token.column, error_code, "unexpected closing delimiter");

        return {
          ok: false,
          data: {
            nesting_level: list_delim_stack.length,
          },
          error_message: error_message,
          error_code: error_code,
        };
      }

      //////////////////////////////////////////////////////
      // Check if we're closing with the proper delimiter //
      //////////////////////////////////////////////////////


      const previous_delim_token = list_delim_stack.pop();

      assert(typeof previous_delim_token !== "undefined");

      const start_token_lexeme = text.substring(previous_delim_token.index, previous_delim_token.index + previous_delim_token.length);
      const end_token_lexeme = text.substring(token.index, token.index + token.length);

      if (GET_CLOSE_VARIANT[start_token_lexeme] === end_token_lexeme) {
        const parse_node_list = parse_node_list_stack.pop();

        assert(typeof parse_node_list !== "undefined");

        parse_node_list_add_child(parse_node_list_stack[parse_node_list_stack.length - 1], parse_node_list);
      } else {
        // Error
        const error_code = ERROR_CODE_DELIM_MISMATCH;

        /** @type {string[]} */
        const error_message = [];

        const lines = text.split("\n");

        // Start token and end token, i.e. opening and closing tokens.
        const start_token = previous_delim_token;
        const end_token = token;

        // Start token value (lexeme) and end token value (lexeme).
        const start_value = start_token_lexeme;
        const end_value = end_token_lexeme;

        let gutter_length = 0;

        gutter_length = Math.max(gutter_length, `${start_token.line + 1}`.length);
        gutter_length = Math.max(gutter_length, `${end_token.line + 1}`.length);
        gutter_length = Math.max(gutter_length, "...".length);

        const prepad = " ".repeat(gutter_length);

        if (start_token.line === end_token.line) {
          // 1 line

          error_message.push(`error[${error_code}]:\n`);
          error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(start_token.column)}v-- opening delimiter\n`);
          error_message.push(`${`${end_token.line + 1}`.padStart(gutter_length, " ")} | ${lines[end_token.line + 0]} \n`);
          error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(end_token.column)}^-- closing delimiter, saw ${end_value} but expected to see ${GET_CLOSE_VARIANT[start_value]}\n`);
        } else if (end_token.line - start_token.line <= 5) {
          // 2 - 5 lines

          error_message.push(`error[${error_code}]:\n`);
          error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(start_token.column)}v-- opening delimiter\n`);
          error_message.push(`${`${start_token.line + 1}`.padStart(gutter_length, " ")} | ${lines[start_token.line + 0]} \n`);

          // Middle lines
          for (let line = start_token.line + 1; line < end_token.line; line += 1) {
            error_message.push(`${`${line + 1}`.padStart(gutter_length, " ")} | ${lines[line + 0]} \n`);
          }

          error_message.push(`${`${end_token.line + 1}`.padStart(gutter_length, " ")} | ${lines[end_token.line + 0]} \n`);
          error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(end_token.column)}^-- closing delimiter, saw ${end_value} but expected to see ${GET_CLOSE_VARIANT[start_value]}\n`);
        } else {
          // +5 lines

          error_message.push(`error[${error_code}]:\n`);
          error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(start_token.column)}v-- opening delimiter\n`);
          error_message.push(`${`${start_token.line + 1}`.padStart(gutter_length, " ")} | ${lines[start_token.line + 0]} \n`);
          error_message.push(`${`${start_token.line + 2}`.padStart(gutter_length, " ")} | ${lines[start_token.line + 1]} \n`);
          error_message.push(`${"...".padStart(gutter_length, " ")} | ...\n`);
          error_message.push(`${`${end_token.line + 0}`.padStart(gutter_length, " ")} | ${lines[end_token.line - 1]} \n`);
          error_message.push(`${`${end_token.line + 1}`.padStart(gutter_length, " ")} | ${lines[end_token.line + 0]} \n`);
          error_message.push(`${prepad.padStart(gutter_length, " ")} | ${" ".repeat(end_token.column)}^-- closing delimiter, saw ${end_value} but expected to see ${GET_CLOSE_VARIANT[start_value]}\n`);
        }

        return {
          ok: false,
          data: {
            nesting_level: list_delim_stack.length,
          },
          error_message: error_message.join(""),
          error_code: error_code,
        };
      }
    } else {
      error_unexpected_unimplemented(`Unimplemented for token: ${token.type}`);
    }
  }

  // Check if we're properly nested.

  if (parse_node_list_stack.length !== 1) {
    assert(parse_node_list_stack.length > 1);

    const token = list_delim_stack[list_delim_stack.length - 1];

    const error_code = ERROR_CODE_UNCLOSED_DELIMITER;

    const error_message = create_error_message(text, token.index, token.line, token.column, error_code, "unclosed delimiter");

    return {
      ok: false,
      data: {
        nesting_level: list_delim_stack.length,
      },
      error_message: error_message,
      error_code: error_code,
    };
  }

  // Return OK result with parse tree.

  assert(parse_node_list_stack.length === 1, `Expected parse tree stack to only contain one element, but has: ${parse_node_list_stack.length}`);

  const parse_nodes = parse_node_list_stack[0].value;

  const parse_trees = parse_nodes;

  return {
    ok: true,
    parse_trees: parse_trees,
  };
}

