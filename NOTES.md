# Notes

## Experiment

B is 12.5x slower than B,

```js
class A {

  /**
   * 
   * @param {number} index 
   * @param {number} length 
   */
  constructor(index, length) {
    this.index = index;
    this.length = length;
    /** @type {string | null} */
    this.lexeme = null;
  }

  get_lexeme() {
    if (this.lexeme === null) {
      this.lexeme = text.substring(this.index, this.index + this.length);

      return this.lexeme;
    } else {
      return this.lexeme;
    }
  }
}

class B {

  /**
   * 
   * @param {number} index 
   * @param {number} length 
   */
  constructor(index, length) {
    this.index = index;
    this.length = length;
    /** @type {string | null} */
    this.lexeme = null;

    this.get_lexeme = this._get_lexeme_first_time.bind(this);
  }

  /**
   * @returns {string}
   * 
   * @private
   */
  _get_lexeme_first_time() {
    this.lexeme = text.substring(this.index, this.index + this.length);

    this.get_lexeme = this._get_lexeme_unchecked.bind(this);

    return this.lexeme;
  }

  /**
   * @returns {string}
   * 
   * @private
   */
  _get_lexeme_unchecked() {
    // @ts-ignore
    return this.lexeme;
  }
}

```
