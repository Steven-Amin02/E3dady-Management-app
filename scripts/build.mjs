import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { source } from '../tests/load-source.mjs';
execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { stdio: 'inherit' });
const files = await readdir('.next/static', { recursive: true });
const assets = files.filter(file => /\.(js|css|woff2?)$/.test(file)).map(file => '/_next/static/' + file.split(path.sep).join('/'));
const { INITIAL_YOUTH, INITIAL_SERVANTS } = source('src/lib/mockData.ts');
for (const asset of assets.filter(file => file.endsWith('.js'))) {
  const content = await readFile(path.join('.next/static', asset.slice('/_next/static/'.length)), 'utf8');
  if ([...INITIAL_YOUTH, ...INITIAL_SERVANTS].some(person => content.includes(person.name) || (person.phone.length >= 8 && content.includes(person.phone)))) {
    throw new Error('Private fixture contact data was found in a public client chunk.');
  }
}
await writeFile('public/precache-manifest.json', JSON.stringify({
  version: (await readFile('.next/BUILD_ID', 'utf8')).trim(),
  assets: [...assets, '/manifest.json', '/icons/icon.svg', '/icons/icon-192x192.png', '/icons/icon-512x512.png'],
}));
console.log(`Prepared ${assets.length} versioned offline assets; public chunks contain no fixture contacts.`);
