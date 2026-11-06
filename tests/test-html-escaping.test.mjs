import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, escapeAttr } from '../js/html.js';

test('HTML escaping helper - unit tests', async (t) => {
  await t.test('escapes special characters &, <, >, ", and \'', () => {
    assert.equal(escapeHtml('&'), '&amp;');
    assert.equal(escapeHtml('<'), '&lt;');
    assert.equal(escapeHtml('>'), '&gt;');
    assert.equal(escapeHtml('"'), '&quot;');
    assert.equal(escapeHtml("'"), '&#39;');
    assert.equal(
      escapeHtml('<script>alert("XSS & \'attack\'")</script>'),
      '&lt;script&gt;alert(&quot;XSS &amp; &#39;attack&#39;&quot;)&lt;/script&gt;'
    );
  });

  await t.test('handles null and undefined by returning empty string', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeAttr(null), '');
    assert.equal(escapeAttr(undefined), '');
  });

  await t.test('handles numbers, booleans and empty strings safely', () => {
    assert.equal(escapeHtml(0), '0');
    assert.equal(escapeHtml(1234), '1234');
    assert.equal(escapeHtml(-45.67), '-45.67');
    assert.equal(escapeHtml(true), 'true');
    assert.equal(escapeHtml(false), 'false');
    assert.equal(escapeHtml(''), '');
  });

  await t.test('preserves valid Unicode characters and accents without mangling', () => {
    const input = 'Verdulería Ñandú ñoquis café limón 🍎 🥑';
    assert.equal(escapeHtml(input), input);
  });

  await t.test('escapeAttr behaves identically to escapeHtml', () => {
    const payload = '"><img src=x onerror=alert(1)>';
    assert.equal(escapeAttr(payload), '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
  });

  await t.test('handles double escaping predictably without corruption', () => {
    const original = '<div class="test">&</div>';
    const escapedOnce = escapeHtml(original);
    assert.equal(escapedOnce, '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;');
    const escapedTwice = escapeHtml(escapedOnce);
    assert.equal(escapedTwice, '&amp;lt;div class=&amp;quot;test&amp;quot;&amp;gt;&amp;amp;&amp;lt;/div&amp;gt;');
  });

  await t.test('neutralizes common XSS vector payloads', () => {
    const payloads = [
      '<img src=x onerror=alert(1)>',
      '"><svg/onload=alert(1)>',
      '<script src="https://evil.com/xss.js"></script>',
      'javascript:alert(1)',
      '\' onfocus=\'alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>'
    ];

    for (const p of payloads) {
      const escaped = escapeHtml(p);
      assert.ok(!escaped.includes('<'), `Payload must not contain raw <: ${p}`);
      assert.ok(!escaped.includes('>'), `Payload must not contain raw >: ${p}`);
      assert.ok(!escaped.includes('"'), `Payload must not contain raw ": ${p}`);
      assert.ok(!escaped.includes("'"), `Payload must not contain raw ': ${p}`);
    }
  });
});
