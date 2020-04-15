// v2020-04-15-145330

declare function declared_assert_function(condition: boolean, message_or_callback?: string | (() => string) | undefined): asserts condition;

// Copy of the class in `syntax.js`.  Maybe there's a better way...
type Token = {
  type: number,
  index: number,
  length: number,
  line: number,
  column: number
}

type ParseNode = Token | ParseNode[];

type ParseTree = ParseNode;

type SimplifiedParseNode = string | SimplifiedParseNode[];

type SimplifiedParseTree = SimplifiedParseNode;

type TokenizationOrParsingErrorCoreResult = {
  ok: false,
  error_message: string,
  error_code: number,
  // Data contains miscellaneous non-standard data.
  data?: any
};

type NegativeParseResult = TokenizationOrParsingErrorCoreResult & {};

type PositiveParseResult = {
  ok: true,
  parse_trees: ParseTree[]
};

type ParseResult = NegativeParseResult | PositiveParseResult;

type NegativeTokenizationResult = TokenizationOrParsingErrorCoreResult & {};

type PositiveTokenizationResult = {
  ok: true,
  tokens: Token[]
};

type TokenizationResult = NegativeTokenizationResult | PositiveTokenizationResult;
