import { run_tests as run_tokenizer_tests } from "./test_tokenizer.js";
import { run_tests as run_parser_tests } from "./test_parser.js";

run_tokenizer_tests();
run_parser_tests();

console.info("OK!");
