// The code size rule of the project (CLAUDE.md, "Code size"): a function is at most 50 lines (PLAN-016, decision D47). Every JavaScript function of the page, the browser
// tools, these tests and the Vite settings is measured with a real parser (rolldown's parseAst, already installed with Vite): function declarations, function
// expressions, arrow functions and methods; the measure is the line count from the first to the last line of the function, comments inside it included.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseAst } from 'rolldown/parseAst';

const MAX_LINES = 50;
const FOLDERS = ['../../frontend/src/', '../../frontend/tools/', '../../tests/frontend/']; // read-only mounts of the frontend-tests service
const SINGLE_FILES = ['../../frontend/vite.config.js'];
const FUNCTIONS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

/** [{ line, name, lines }] of every function in `source` that is longer than `max` lines. */
export function longFunctions(source, max = MAX_LINES) {
  const found = [];
  const lineOf = (offset) => source.slice(0, offset).split('\n').length;
  const nameFor = (node, inherited) => {
    if (node.type === 'VariableDeclarator' && node.id?.name) return node.id.name;
    if ((node.type === 'Property' || node.type === 'MethodDefinition') && node.key) return node.key.name ?? node.key.value ?? inherited;
    return inherited;
  };
  const walk = (node, name) => {
    if (!node || typeof node.type !== 'string') return;
    if (FUNCTIONS.has(node.type)) {
      const lines = source.slice(node.start, node.end).split('\n').length;
      if (lines > max) found.push({ line: lineOf(node.start), name: node.id?.name ?? name ?? '(anonymous)', lines });
    }
    const here = nameFor(node, name);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type' || key === 'start' || key === 'end') continue;
      for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object') walk(child, here);
    }
  };
  walk(parseAst(source, { lang: 'js' }), undefined);
  return found;
}

test('the measuring works: a function of 51 lines is found, one of 50 is not, an arrow function and a method are measured too', () => {
  const body = (n) => Array.from({ length: n - 2 }, (_, i) => `  const v${i} = ${i};`).join('\n');
  assert.equal(longFunctions(`function big() {\n${body(51)}\n}\n`).length, 1);
  assert.equal(longFunctions(`function ok() {\n${body(50)}\n}\n`).length, 0);
  assert.deepEqual(longFunctions(`const arrow = () => {\n${body(60)}\n};\n`).map((f) => [f.name, f.lines]), [['arrow', 60]]);
  assert.deepEqual(longFunctions(`const o = {\n  async method() {\n${body(60)}\n  },\n};\n`).map((f) => [f.name, f.lines]), [['method', 60]]);
});

test('no JavaScript function of the page, the browser tools, the tests or the Vite settings is longer than 50 lines', () => {
  const files = [...SINGLE_FILES];
  for (const folder of FOLDERS) for (const name of readdirSync(new URL(folder, import.meta.url))) if (/\.m?js$/.test(name)) files.push(folder + name);
  assert.ok(files.length >= 40, `${files.length} files were found: a mount is missing`);
  const problems = [];
  for (const file of files) {
    for (const f of longFunctions(readFileSync(new URL(file, import.meta.url), 'utf8'))) problems.push(`${file.replace('../../', '')}:${f.line} ${f.name} ${f.lines} lines`);
  }
  assert.deepEqual(problems, [], `functions over ${MAX_LINES} lines:\n  ${problems.join('\n  ')}`);
});
