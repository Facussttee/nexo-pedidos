const fs = require('fs');

const files = [
  'index.html',
  'js/app.js',
  'js/views/client.js',
  'js/views/operator.js',
  'js/views/admin.js'
];

function checkFile(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const regex = /<(button|a)\b([\s\S]*?)>([\s\S]*?)<\/\1>/gi;
  let m;
  let items = [];
  while ((m = regex.exec(content)) !== null) {
    const tag = m[1];
    const attrs = m[2];
    const inner = m[3].replace(/\s+/g, ' ').trim();
    const line = content.substring(0, m.index).split('\n').length;
    
    const classMatch = attrs.match(/class=["']([^"']*)["']/i);
    const classes = classMatch ? classMatch[1] : '';
    
    // Check height
    const hasMinH = /min-h-\[(4[4-9]|[5-9][0-9]|1[0-9][0-9])px\]|min-h-1[1-9]|h-1[1-9]|h-12|h-14|h-16|py-3|py-3\.5|py-4|\btouch-target\b/i.test(classes);
    // Check width
    const hasMinW = /min-w-\[(4[4-9]|[5-9][0-9]|1[0-9][0-9])px\]|w-1[1-9]|w-12|w-14|w-16|w-full|flex-1|px-3|px-4|px-5|\btouch-target\b/i.test(classes);
    
    if (!hasMinH || !hasMinW) {
      items.push({ line, tag, inner: inner.substring(0, 60), classes, attrs: attrs.replace(/\s+/g, ' ').trim() });
    }
  }
  return items;
}

files.forEach(f => {
  const flagged = checkFile(f);
  if (flagged.length > 0) {
    console.log(`\n=== ${f} (${flagged.length} flagged) ===`);
    flagged.forEach(it => {
      console.log(`Line ${it.line}: <${it.tag}> "${it.inner}"`);
      console.log(`  classes: ${it.classes}`);
      console.log(`  attrs:   ${it.attrs}\n`);
    });
  } else {
    console.log(`\n=== ${f}: 0 flagged ===`);
  }
});
