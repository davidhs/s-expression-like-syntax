// v2020-04-16-223100

// -----------------------------------------------------------------------------
// Assertion function

declare function declared_assert_function(condition: boolean, message_or_callback?: string | (() => string) | undefined): asserts condition;

// -----------------------------------------------------------------------------
// Tokenization and parsing negative result

type TokenizationOrParsingErrorCoreResult = {
  ok: false,
  error_message: string,
  error_code: number,
  // Data contains miscellaneous non-standard data.
  data?: any
};

// -----------------------------------------------------------------------------
// Tokenization

type TokenTypeWhitespace /**********/ = 100;
type TokenTypeWord /****************/ = 101;
type TokenTypeDoubleQuoteString /***/ = 102;
type TokenTypeSingleQuoteString /***/ = 103;
type TokenTypeListDelimiterOpen /***/ = 104;
type TokenTypeListDelimiterClose /**/ = 105;
type TokenTypeSingleLineComment /***/ = 106;
type TokenTypeMultiLineComment /****/ = 107;

type TokenType
  = TokenTypeWhitespace
  | TokenTypeWord
  | TokenTypeDoubleQuoteString
  | TokenTypeSingleQuoteString
  | TokenTypeListDelimiterOpen
  | TokenTypeListDelimiterClose
  | TokenTypeSingleLineComment
  | TokenTypeMultiLineComment
  ;


// Copy of the class in `syntax.js`.  Maybe there's a better way...
type Token = {
  type: TokenType;
  index: number;
  length: number;
  line: number;
  column: number;
};

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

type NegativeTokenizationResult = TokenizationOrParsingErrorCoreResult;

type PositiveTokenizationResult = {
  ok: true,
  tokens: Token[]
};

type TokenizationResult = NegativeTokenizationResult | PositiveTokenizationResult;

// -----------------------------------------------------------------------------
// Parsing

type ParseNodeTypeList = 200;

type ParseNodeList = {
  type: ParseNodeTypeList;
  index: number;
  // How much does this list span
  length: number;
  line: number;
  column: number;

  children: ParseNode[];
};

type ParseNode = Token | ParseNodeList;

type ParseTree = ParseNode;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

type NegativeParseResult = TokenizationOrParsingErrorCoreResult;

type PositiveParseResult = {
  ok: true;
  parse_trees: ParseTree[];
};

type ParseResult = NegativeParseResult | PositiveParseResult;

// -----------------------------------------------------------------------------
// Simplified parse nodes

type SimplifiedParseNode = string | SimplifiedParseNode[];

type SimplifiedParseTree = SimplifiedParseNode;

// -----------------------------------------------------------------------------

