import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
const requireSource = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, 'src', request.slice(2));
  return originalResolve.call(this, request, parent, ...rest);
};
Module._extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  module._compile(code, filename);
};
export const source = relative => requireSource(path.join(root, relative));
export function replaceSource(relative, exports) {
  const filename = requireSource.resolve(path.join(root, relative));
  requireSource.cache[filename] = { id: filename, filename, loaded: true, exports };
}
