import { assert } from "./utils.js";
import * as Syntax from "../src/syntax.js";


/**
 * 
 * @param {string} text 
 * @param {(string | (() => string))=} message_or_callback 
 */
function assert_is_ok(text, message_or_callback = "Assertion failed!") {
  const parse_result = Syntax.parse(text);

  assert(parse_result.ok, message_or_callback);
}


/**
 * 
 * @param {string} text 
 * @param {(string | (() => string))=} message_or_callback 
 */
function assert_is_not_ok(text, message_or_callback = "Assertion failed!") {
  const parse_result = Syntax.parse(text);

  assert(!parse_result.ok, message_or_callback);
}


/**
 * @type {<T>(a: T, b: T) => void}
 */
function assert_is_eq(a, b) {
  assert(a === b);
}

/**
 * @type {<T>(a: T, b: T) => void}
 */
function assert_is_neq(a, b) {
  assert(a !== b);
}


function test_empty_text() {
  assert_is_ok("");
}


function test_whitespace() {
  assert_is_ok(" ");
}


function test_nesting() {
  assert_is_ok("()");
  assert_is_ok("[]");
  assert_is_ok("{}");

  assert_is_ok("(())");
  assert_is_ok("[()]");
  assert_is_ok("{()}");

  assert_is_ok("([])");
  assert_is_ok("[[]]");
  assert_is_ok("{[]}");

  assert_is_ok("({})");
  assert_is_ok("[{}]");
  assert_is_ok("{{}}");

  assert_is_ok("(()(()(((((()))))())())((())(())())(())()()()())");
}


function test_list_delim_mismatch() {
  assert_is_not_ok("(]");
  assert_is_not_ok("(}");
  assert_is_not_ok("[)");
  assert_is_not_ok("[}");
  assert_is_not_ok("{)");
  assert_is_not_ok("{]");

  assert_is_not_ok(` a ( b
    c
     d  ]  e
     `);
}


function test_broken_nesting() {
  assert_is_not_ok("(");
  assert_is_not_ok("[");
  assert_is_not_ok("{");

  assert_is_not_ok(")");
  assert_is_not_ok("]");
  assert_is_not_ok("}");


  assert_is_not_ok("((");
  assert_is_not_ok("[[");
  assert_is_not_ok("{{");

  assert_is_not_ok("))");
  assert_is_not_ok("]]");
  assert_is_not_ok("}}");

  assert_is_not_ok("())");
  assert_is_not_ok("[]]");
  assert_is_not_ok("{}}");


  assert_is_not_ok(`

  ( a  
  
  `);
  assert_is_not_ok(`

  ) a  
 
 `);
}


function test_single_line_comments() {
  assert_is_ok(";");
  assert_is_ok(" ;");
  assert_is_ok("; ");
  assert_is_ok(" ; ");
  assert_is_ok(`
  ;   asdf asdf ; asdf 

`);
}


function test_multi_line_comment() {
  assert_is_not_ok("|#");
  assert_is_not_ok(" |#");
  assert_is_not_ok("|# ");
  assert_is_not_ok(" |# ");
  assert_is_not_ok(`
    

    |#  
    
  `);
}


function test_double_quoted_strings() {
  assert_is_ok(`"\\""`);

  assert_is_not_ok(`"`);

  assert_is_ok(String.raw` "Hello \"John\"" `);
  assert_is_not_ok(`"
`);
}


function test_single_quoted_strings() {

}

function test_something() {

  {
    const text = `; Hello
(say (name [x 1 "y"]))`;
    const parse_result = Syntax.parse(text);
    assert(parse_result.ok);

    const { parse_trees } = parse_result;
    const simplified_parse_trees = Syntax.to_simplified_parse_trees(text, parse_trees, true, true);

    const a = simplified_parse_trees;
    const b = ["; Hello\n", ["(", "say", " ", ["(", "name", " ", ["[", "x", " ", "1", " ", "\"y\"", "]"], ")"], ")"]];

    const sa = JSON.stringify(a);
    const sb = JSON.stringify(b);

    assert_is_eq(sa, sb);

  }
}


export function run_tests() {
  test_nesting();

  test_empty_text();
  test_whitespace();

  test_broken_nesting();
  test_list_delim_mismatch();

  test_double_quoted_strings();
  test_single_quoted_strings();

  test_single_line_comments();
  test_multi_line_comment();

  test_something();
}


if (false) {
  const text = `
  
  ; Hello
  (fn add (a b)
    (+ a b)
  )

  #| This is a 
     #| Multi-line |#
    nesting comment
  |#

  (fn inc (x)
    (+ x 1)
  )
  
  `;

  const include_comments = true;
  const include_whitespace = true;
  const include_list_delimiters = true;
  
  const parse_result = Syntax.parse(text, include_comments, include_whitespace, include_list_delimiters);

  if (parse_result.ok) {
    const { parse_trees } = parse_result;

    console.info(JSON.stringify(parse_trees, null, 2));

    // console.info(parse_trees);
  } else {
    console.error(parse_result.error_code);
  }
}

