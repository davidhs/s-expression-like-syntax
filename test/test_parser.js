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
}
