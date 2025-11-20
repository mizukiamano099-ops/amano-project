// src/compiler/lexer.js
//
// シンプルなトークナイザ（字句解析器）
// Amano テンプレートの簡易 DSL / YAML 風表記 / JSON 混在を受け入れ、
// パーサが扱いやすいトークン列へ変換します。
// 外部依存なしの実装。エラーメッセージは日本語でわかりやすくしています。

/**
 * トークン型の定義
 * type Token = { type: string, value: any, line: number, col: number }
 */

/**
 * 入力文字列をトークン列に変換する。
 * @param {string} input - 入力テキスト
 * @returns {Array} tokens - トークン配列
 */
function tokenize(input) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const peek = () => input[i];
  const next = () => input[i++];
  const eof = () => i >= input.length;

  const isSpace = (ch) => ch === ' ' || ch === '\t' || ch === '\r';
  const isNewline = (ch) => ch === '\n';
  const isDigit = (ch) => /[0-9]/.test(ch);
  const isIdentStart = (ch) => /[A-Za-z_@#\$%&\-\+]/.test(ch);
  const isIdent = (ch) => /[A-Za-z0-9_\-]/.test(ch);

  function pushToken(type, value, l = line, c = col) {
    tokens.push({ type, value, line: l, col: c });
  }

  while (!eof()) {
    let ch = peek();

    // 空白
    if (isSpace(ch)) {
      next();
      col++;
      continue;
    }

    // 改行
    if (isNewline(ch)) {
      next();
      line++;
      col = 1;
      pushToken('NEWLINE', '\n', line - 1, 1);
      continue;
    }

    // コメント（# または // で行コメント）
    if (ch === '#') {
      // 行末までスキップ
      while (!eof() && !isNewline(peek())) {
        next();
        col++;
      }
      continue;
    }
    if (ch === '/' && input[i + 1] === '/') {
      // // コメント
      next(); next();
      col += 2;
      while (!eof() && !isNewline(peek())) {
        next();
        col++;
      }
      continue;
    }

    // 文字列（"..." または '...'）
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startCol = col;
      next(); col++;
      let value = '';
      while (!eof()) {
        const c = next();
        col++;
        if (c === '\\') {
          // エスケープ
          const esc = next(); col++;
          if (esc === 'n') value += '\n';
          else if (esc === 't') value += '\t';
          else value += esc;
          continue;
        }
        if (c === quote) break;
        if (c === '\n') {
          line++;
          col = 1;
        }
        value += c;
      }
      pushToken('STRING', value, line, startCol);
      continue;
    }

    // 数字（整数・小数）
    if (isDigit(ch) || (ch === '-' && isDigit(input[i + 1]))) {
      const startCol = col;
      let numStr = '';
      let dotCount = 0;
      if (ch === '-') {
        numStr += next(); col++;
      }
      while (!eof()) {
        const c = peek();
        if (isDigit(c)) {
          numStr += next(); col++;
          continue;
        }
        if (c === '.') {
          dotCount++;
          numStr += next(); col++;
          continue;
        }
        break;
      }
      // 整数 or 実数
      if (dotCount > 0) {
        pushToken('NUMBER', parseFloat(numStr), line, startCol);
      } else {
        pushToken('NUMBER', parseInt(numStr, 10), line, startCol);
      }
      continue;
    }

    // 記号系
    if ([':', '-', '{', '}', '[', ']', ',', '(', ')'].includes(ch)) {
      next(); col++;
      pushToken('PUNC', ch, line, col - 1);
      continue;
    }

    // 識別子（キー名や bareword）
    if (isIdentStart(ch)) {
      const startCol = col;
      let id = '';
      while (!eof() && isIdent(peek())) {
        id += next(); col++;
      }
      // true / false / null の変換
      if (id === 'true' || id === 'false') {
        pushToken('BOOLEAN', id === 'true', line, startCol);
      } else if (id === 'null') {
        pushToken('NULL', null, line, startCol);
      } else {
        pushToken('IDENT', id, line, startCol);
      }
      continue;
    }

    // ここに来たら未知の文字
    throw new Error(`字句解析エラー: 未知の文字 '${ch}' (line ${line}, col ${col})`);
  }

  pushToken('EOF', null, line, col);
  return tokens;
}

module.exports = { tokenize };
