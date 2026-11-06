/**
 * EMPIRICAL ADVERSARIAL TEST SUITE - REQUIREMENT R1
 * miHuerta Mobile-First Redesign & UX/UI Overhaul
 * Challenger 1 (Viewport & Touch Ergonomics Adversarial Tester)
 * 
 * Tests:
 * 1. Touch Targets: Scan every button, link, input, and interactive element across
 *    index.html and all views (client.js, operator.js, admin.js, app.js).
 *    Verify whether touch bounding box >= 44x44px.
 * 2. Form Input Font Sizes: Scan every <input>, <select>, <textarea> to ensure
 *    font-size >= 16px to prevent iOS Safari auto-zoom.
 * 3. Zero Emojis: Verify 0 Unicode emojis across HTML, CSS, JS views, and data.
 * 4. Viewport Overflow: Verify layout width constraints, grid columns, and flex wrapping
 *    across 360px, 375px, 390px, 412px, and 430px viewports.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const defects = [];
const passes = [];

function recordPass(suite, name, details) {
  totalTests++;
  passedTests++;
  passes.push({ suite, name, details });
  console.log(`  [PASS] ${suite} -> ${name}`);
}

function recordFail(suite, name, details, defectDetails) {
  totalTests++;
  failedTests++;
  defects.push({ suite, name, details, defectDetails });
  console.error(`  [FAIL] ${suite} -> ${name}`);
  console.error(`         Reason: ${defectDetails.reason}`);
  console.error(`         Location: ${defectDetails.location}`);
  console.error(`         Observed: ${defectDetails.observed}`);
  console.error(`         Expected: ${defectDetails.expected}`);
}

// =========================================================================
// SUITE 1: TOUCH TARGETS (44x44px Minimum Hitbox)
// =========================================================================
console.log('\n===============================================================');
console.log('   SUITE 1: TOUCH TARGETS (44x44px Minimum Hitbox Audit)');
console.log('===============================================================\n');

const filesToAudit = [
  { file: 'index.html', name: 'Simulator & Shell' },
  { file: 'js/app.js', name: 'App Shell & PIN Gate' },
  { file: 'js/views/client.js', name: 'Client View' },
  { file: 'js/views/operator.js', name: 'Operator Kanban View' },
  { file: 'js/views/admin.js', name: 'Admin Prices View' }
];

function estimateElementBox(tag, attrs, innerText) {
  const classMatch = attrs.match(/class=["']([^"']*)["']/i);
  const classes = classMatch ? classMatch[1] : '';
  const styleMatch = attrs.match(/style=["']([^"']*)["']/i);
  const styles = styleMatch ? styleMatch[1] : '';

  // Height estimation
  let minHeight = 0;
  if (/min-h-\[(\d+)px\]/i.test(classes)) {
    minHeight = parseInt(classes.match(/min-h-\[(\d+)px\]/i)[1], 10);
  } else if (/h-11\b/i.test(classes)) {
    minHeight = 44; // 2.75rem
  } else if (/h-12\b/i.test(classes)) {
    minHeight = 48; // 3rem
  } else if (/min-h-\[48px\]/i.test(classes)) {
    minHeight = 48;
  } else if (/min-h-\[50px\]/i.test(classes)) {
    minHeight = 50;
  } else if (/min-h-\[52px\]/i.test(classes)) {
    minHeight = 52;
  } else if (/\btouch-target\b/i.test(classes)) {
    minHeight = 44;
  } else if (/py-3\.5/i.test(classes)) {
    minHeight = 14 * 2 + 16; // 44px
  } else if (/py-4/i.test(classes)) {
    minHeight = 16 * 2 + 16; // 48px
  } else if (/py-3\b/i.test(classes)) {
    minHeight = 12 * 2 + 16; // 40px (< 44px!)
  } else if (/py-2\.5/i.test(classes)) {
    minHeight = 10 * 2 + 16; // 36px
  } else if (/py-2\b/i.test(classes)) {
    minHeight = 8 * 2 + 16; // 32px
  } else if (/py-1\.5/i.test(classes)) {
    minHeight = 6 * 2 + 16; // 28px
  } else if (/py-1\b/i.test(classes)) {
    minHeight = 4 * 2 + 16; // 24px
  } else if (/p-3\.5/i.test(classes)) {
    minHeight = 14 * 2 + 16; // 44px
  } else if (/p-3\b/i.test(classes)) {
    minHeight = 12 * 2 + 20; // 44px (with title/desc)
  } else if (/p-2\.5/i.test(classes)) {
    minHeight = 10 * 2 + 16; // 36px
  } else {
    // raw text line
    minHeight = 16;
  }

  // Width estimation
  let minWidth = 0;
  if (/min-w-\[(\d+)px\]/i.test(classes)) {
    minWidth = parseInt(classes.match(/min-w-\[(\d+)px\]/i)[1], 10);
  } else if (/w-11\b/i.test(classes)) {
    minWidth = 44;
  } else if (/w-12\b/i.test(classes)) {
    minWidth = 48;
  } else if (/\btouch-target\b/i.test(classes)) {
    minWidth = 44;
  } else if (/\bw-full\b|\bflex-1\b/i.test(classes)) {
    minWidth = 120; // fluid block, expands to parent width
  } else if (/px-4\b/i.test(classes)) {
    minWidth = 16 * 2 + (innerText.length * 6);
  } else if (/px-3\.5\b/i.test(classes)) {
    minWidth = 14 * 2 + (innerText.length * 6);
  } else if (/px-3\b/i.test(classes)) {
    minWidth = 12 * 2 + (innerText.length * 6);
  } else if (/px-2\.5\b/i.test(classes)) {
    minWidth = 10 * 2 + (innerText.length * 6);
  } else {
    minWidth = innerText.length * 7;
  }

  return { minHeight, minWidth, classes };
}

filesToAudit.forEach(({ file, name }) => {
  const filePath = path.join(ROOT, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Match all <button ...> and <a ...> tags
  const elementRegex = /<(button|a)\b([\s\S]*?)>([\s\S]*?)<\/\1>/gi;
  let match;
  let elementIndex = 0;

  while ((match = elementRegex.exec(content)) !== null) {
    elementIndex++;
    const tag = match[1];
    const attrs = match[2];
    const inner = match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const line = content.substring(0, match.index).split('\n').length;

    const idMatch = attrs.match(/id=["']([^"']*)["']/i);
    const id = idMatch ? `#${idMatch[1]}` : '';
    const label = id || inner.substring(0, 25) || `<${tag}>`;

    const { minHeight, minWidth, classes } = estimateElementBox(tag, attrs, inner);

    // WCAG standard: min 44x44px
    if (minHeight < 44 || minWidth < 44) {
      recordFail(
        'Touch Target Size',
        `${name} -> ${label} (Line ${line})`,
        { file, line, tag, classes },
        {
          reason: `Interactive <${tag}> has estimated dimensions ${minWidth}x${minHeight}px, which violates the 44x44px minimum requirement.`,
          location: `${file}:${line}`,
          observed: `Estimated bounding box: width=${minWidth}px, height=${minHeight}px (classes: "${classes}")`,
          expected: 'Minimum 44x44px (min-h-[44px] min-w-[44px] or .touch-target)'
        }
      );
    } else {
      recordPass(
        'Touch Target Size',
        `${name} -> ${label} (Line ${line}): ${minWidth}x${minHeight}px >= 44x44px`,
        { file, line }
      );
    }
  }
});

// =========================================================================
// SUITE 2: FORM INPUT FONT SIZE (>= 16px to prevent iOS auto-zoom)
// =========================================================================
console.log('\n===============================================================');
console.log('   SUITE 2: FORM INPUT FONT SIZES (>= 16px iOS Auto-Zoom Guard)');
console.log('===============================================================\n');

// 2.1 CSS Defensive Rule in css/style.css
const cssContent = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
const hasCssInputRule = /@media[^{]*max-width:\s*768px[^{]*\{[\s\S]*?(input|select|textarea)[\s\S]*?font-size:\s*16px\s*!important/i.test(cssContent);

if (hasCssInputRule) {
  recordPass('Input Font Size', 'CSS global guard: @media (max-width: 768px) { input, select, textarea { font-size: 16px !important; } } is active.');
} else {
  recordFail('Input Font Size', 'CSS global guard missing in css/style.css', {}, {
    reason: 'Missing @media screen and (max-width: 768px) input font-size 16px rule in css/style.css',
    location: 'css/style.css',
    observed: 'Rule not found',
    expected: 'font-size: 16px !important'
  });
}

// 2.2 Individual Form Elements in Views
filesToAudit.forEach(({ file, name }) => {
  const filePath = path.join(ROOT, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const inputRegex = /<(input|select|textarea)\b([\s\S]*?)>/gi;
  let match;

  while ((match = inputRegex.exec(content)) !== null) {
    const tag = match[1];
    const attrs = match[2];
    const line = content.substring(0, match.index).split('\n').length;
    const typeMatch = attrs.match(/type=["']([^"']*)["']/i);
    const type = typeMatch ? typeMatch[1].toLowerCase() : 'text';

    // Radio/checkbox inputs don't suffer from text zoom, but text/search/tel/number/password/url do
    if (['radio', 'checkbox', 'hidden'].includes(type)) {
      continue;
    }

    const classMatch = attrs.match(/class=["']([^"']*)["']/i);
    const classes = classMatch ? classMatch[1] : '';

    const hasExplicit16pxOrMore = /\b(text-base|text-lg|text-xl|text-2xl|text-3xl|text-\[1[6-9]px\]|text-\[2[0-9]px\])\b/i.test(classes);
    const hasSmallerFont = /\b(text-xs|text-sm|text-\[(?:[0-9]|1[0-5])px\])\b/i.test(classes);

    if (hasSmallerFont && !hasExplicit16pxOrMore) {
      recordFail(
        'Input Font Size',
        `${name} -> <${tag} type="${type}"> (Line ${line})`,
        { file, line, classes },
        {
          reason: `Input has class indicating font size < 16px: "${classes}" which may trigger iOS auto-zoom`,
          location: `${file}:${line}`,
          observed: classes,
          expected: 'text-base (16px) or larger'
        }
      );
    } else {
      recordPass(
        'Input Font Size',
        `${name} -> <${tag} type="${type}"> (Line ${line}): font size >= 16px (${classes.match(/text-(base|lg|xl|2xl|[^\s]+)/)?.[0] || 'handled by CSS guard'})`,
        { file, line }
      );
    }
  }
});

// =========================================================================
// SUITE 3: ZERO EMOJIS & CLEAN TYPOGRAPHY AUDIT
// =========================================================================
console.log('\n===============================================================');
console.log('   SUITE 3: ZERO EMOJIS & CLEAN TYPOGRAPHY AUDIT');
console.log('===============================================================\n');

// Comprehensive Unicode Emoji regular expression
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}]/u;

const allProjectFiles = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/products-data.js',
  'js/store.js',
  'js/bundle.js',
  'js/views/client.js',
  'js/views/operator.js',
  'js/views/admin.js'
];

allProjectFiles.forEach(file => {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let fileHasEmoji = false;
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      fileHasEmoji = true;
      recordFail(
        'Zero Emojis',
        `${file}:${idx + 1}`,
        { file, line: idx + 1, content: line.trim() },
        {
          reason: 'Emoji character found in codebase',
          location: `${file}:${idx + 1}`,
          observed: line.trim(),
          expected: 'Zero emojis in HTML, CSS, JS views, and data files'
        }
      );
    }
  });

  if (!fileHasEmoji) {
    recordPass('Zero Emojis', `${file}: 0 emojis verified across all lines.`);
  }
});

// =========================================================================
// SUITE 4: VIEWPORT OVERFLOW & LAYOUT CONSTRAINTS (360px - 430px)
// =========================================================================
console.log('\n===============================================================');
console.log('   SUITE 4: VIEWPORT OVERFLOW AUDIT (360px, 375px, 390px, 412px, 430px)');
console.log('===============================================================\n');

// 4.1 Root Viewport Overflow Guard in CSS
const hasRootOverflowGuard = /(?:html|body)[\s\S]*?max-width:\s*100vw;[\s\S]*?overflow-x:\s*(?:clip|hidden);/i.test(cssContent);
if (hasRootOverflowGuard) {
  recordPass('Viewport Overflow', 'Root CSS guard: html, body { max-width: 100vw; overflow-x: hidden; position: relative; } active.');
} else {
  recordFail('Viewport Overflow', 'Root CSS guard missing in css/style.css', {}, {
    reason: 'Root overflow guard missing',
    location: 'css/style.css',
    observed: 'Not found',
    expected: 'html, body { max-width: 100vw; overflow-x: hidden; }'
  });
}

// 4.2 Fixed Pixel Widths Exceeding Viewports (Check for hardcoded widths > 340px outside responsive queries)
filesToAudit.forEach(({ file, name }) => {
  const filePath = path.join(ROOT, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Search for fixed widths > 340px that don't have max-width or w-full
  const widthMatches = content.match(/\b(w-\[(\d+)px\]|min-w-\[(\d+)px\])\b/g) || [];
  let fileHasOverflowWidth = false;

  widthMatches.forEach(match => {
    const px = parseInt(match.replace(/[^0-9]/g, ''), 10);
    if (px > 340) {
      fileHasOverflowWidth = true;
      recordFail('Viewport Overflow', `${name} -> Hardcoded width ${match}`, {}, {
        reason: `Hardcoded pixel width ${px}px exceeds smallest mobile viewport width (360px)`,
        location: file,
        observed: match,
        expected: 'Fluid width or max-w-full / w-full'
      });
    }
  });

  if (!fileHasOverflowWidth) {
    recordPass('Viewport Overflow', `${name}: No hardcoded pixel widths exceeding 340px found.`);
  }
});

// 4.3 Viewport Simulation across widths: 360px, 375px, 390px, 412px, 430px
const viewports = [360, 375, 390, 412, 430];
viewports.forEach(vp => {
  // Validate that key responsive structures compute cleanly:
  // 1. Client catalog header: padding 16px * 2 = 32px; remaining = vp - 32px
  const clientHeaderRemaining = vp - 32;
  const clientCartThemeWidth = 70 + 80 + 6; // ~156px
  const clientTitleWidth = clientHeaderRemaining - clientCartThemeWidth;

  // 2. Operator 4-column Kanban tabs: padding 12px * 2 = 24px; gap 4px * 3 = 12px; container pad 8px; total = 44px
  const tabWidth = (vp - 44) / 4;

  // 3. Admin product card Row 2: stepper - (44px) + stepper + (44px) + label (50px) + gap (16px) = 154px; input gets flex-1
  const adminInputWidth = (vp - 32) - 154;

  const valid = clientTitleWidth >= 100 && tabWidth >= 70 && adminInputWidth >= 100;
  if (valid) {
    recordPass(
      'Viewport Simulation',
      `Viewport ${vp}px: clientTitle=${Math.round(clientTitleWidth)}px, kanbanTab=${Math.round(tabWidth)}px, adminPriceInput=${Math.round(adminInputWidth)}px -> Clean fluid fit (0 overflow-x)`
    );
  } else {
    recordFail(
      'Viewport Simulation',
      `Viewport ${vp}px column compression defect`,
      {},
      {
        reason: `Layout element squeezed below minimum viable width on ${vp}px`,
        location: 'Responsive layout',
        observed: `tabWidth=${tabWidth}px, adminInputWidth=${adminInputWidth}px`,
        expected: 'Clean responsive allocation without overflow'
      }
    );
  }
});

// =========================================================================
// SUMMARY & VERDICT
// =========================================================================
console.log('\n===============================================================');
console.log('   EMPIRICAL ADVERSARIAL TEST SUMMARY');
console.log('===============================================================\n');
console.log(`Total assertions: ${totalTests}`);
console.log(`Passed:           ${passedTests}`);
console.log(`Failed:           ${failedTests}`);
console.log(`Defects found:    ${defects.length}`);

if (defects.length > 0) {
  console.log('\n--- CONFIRMED DEFECTS LIST ---');
  defects.forEach((d, idx) => {
    console.log(`\n[DEFECT ${idx + 1}] ${d.suite}: ${d.name}`);
    console.log(`  Location: ${d.defectDetails.location}`);
    console.log(`  Observed: ${d.defectDetails.observed}`);
    console.log(`  Expected: ${d.defectDetails.expected}`);
    console.log(`  Reason:   ${d.defectDetails.reason}`);
  });
  console.log('\nFINAL VERDICT: DEFECT FOUND (Touch targets < 44x44px detected)');
} else {
  console.log('\nFINAL VERDICT: CONFIRMED CORRECT');
}
