import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const sourceFiles = execFileSync('git', ['ls-files', 'src', 'server', 'scripts'], { encoding: 'utf8' })
  .split('\n')
  .filter((file) => /\.(jsx?|mjs)$/.test(file));

const failures = [];
const nodeCheckable = sourceFiles.filter((file) => /\.(js|mjs)$/.test(file) && !file.endsWith('.jsx'));

for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');
  if (/^(<<<<<<<|=======|>>>>>>>) /m.test(source)) failures.push(`${file}: contains merge conflict markers`);
  if (/try\s*\{[\s\S]{0,500}?\b(import|require)\b/.test(source)) failures.push(`${file}: wraps an import/require in a try block`);
  if (/\.only\s*\(/.test(source)) failures.push(`${file}: contains focused test/debug marker (.only)`);
}

for (const file of nodeCheckable) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    const details = error.stderr?.toString() || error.stdout?.toString() || error.message;
    failures.push(`${file}: failed node --check\n${details.trim()}`);
  }
}

if (failures.length) {
  console.error(`Source lint failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Source lint passed for ${sourceFiles.length} files (${nodeCheckable.length} syntax-checked with node --check).`);
