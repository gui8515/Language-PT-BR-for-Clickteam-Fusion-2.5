const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'Languages', 'en-us', 'Modules');
const files = fs.readdirSync(dir);
let renamed = 0;

for (const name of files) {
  if (!name.toLowerCase().endsWith('.txt')) continue;

  const src = path.join(dir, name);
  const targetName = path.join(dir, `${path.basename(name, '.txt')}.json`);

  if (fs.existsSync(targetName)) {
    console.log(`Ignorando porque já existe: ${path.basename(targetName)}`);
    continue;
  }

  fs.renameSync(src, targetName);
  renamed += 1;
  console.log(`Renomeado: ${name} -> ${path.basename(targetName)}`);
}

console.log(`\nTotal renomeado: ${renamed}`);
