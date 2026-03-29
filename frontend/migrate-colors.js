const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk(srcDir);
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Convert strictly hardcoded text-white to text-[var(--color-on-bg)] safely via regex
  // Ignore "hover:text-white" because usually that implies becoming white on dark hover
  content = content.replace(/(?<!hover:)text-white/g, 'text-[var(--color-on-bg)]');
  
  // Also hover:text-white usually means hovering becomes inverted, we can ignore or replace it
  // Let's replace hover:text-white with hover:text-[var(--color-on-bg)]
  content = content.replace(/hover:text-white/g, 'hover:text-[var(--color-on-bg)]');
  
  // Also bg-[#121A20] used in <options>
  content = content.replace(/bg-\[#121A20\]/g, 'bg-[var(--color-surface-low)]');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});

console.log(`Replaced text-white in ${changedCount} files.`);
