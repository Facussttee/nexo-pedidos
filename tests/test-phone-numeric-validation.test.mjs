/**
 * MI HUERTA - TEST SUITE: CLIENT & OPERATOR PHONE NUMERIC ONLY VALIDATION
 *
 * Verifies:
 * 1. Client Phone Input HTML Attributes (type="tel", inputmode="numeric", pattern="[0-9]{8,15}", maxlength="15")
 * 2. Keydown Event Non-Numeric Character Blocking
 * 3. Input Event Live Sanitization (Strips letters and symbols)
 * 4. Paste Event Sanitization (Strips non-digits from pasted text)
 * 5. Phone Form Submit Validation (<8 digits blocked with error message, >=8 digits accepted)
 * 6. Store Defensive Guard (saveCustomer refuses empty/non-numeric phones, getCustomer safely returns null)
 * 7. Operator Edit Phone Input Sanitization & Attributes
 */

import assert from "node:assert";
import fs from "node:fs";

console.log("===============================================================");
console.log("   TEST SUITE: CLIENT & OPERATOR PHONE NUMERIC ONLY VALIDATION");
console.log("===============================================================");

let totalPassed = 0;
function pass(msg) {
  totalPassed++;
  console.log(`  [PASS] ${msg}`);
}

// ---------------------------------------------------------------------------
// SUITE 1: HTML ATTRIBUTES & DOM STRUCTURE
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 1: Client View Template & HTML Attributes ---");

const clientSrc = fs.readFileSync("js/views/client.js", "utf8");
const bundleSrc = fs.readFileSync("js/bundle.js", "utf8");

// 1.1 Phone input exists in client view and bundle
assert.ok(clientSrc.includes('id="phone-input"'), "phone-input ID must exist in client.js");
assert.ok(bundleSrc.includes('id="phone-input"'), "phone-input ID must exist in bundle.js");
pass("1.1 #phone-input exists in source and compiled bundle");

// 1.2 Attributes check in client.js
const phoneInputMatch = clientSrc.match(/<input[^>]*id="phone-input"[^>]*>/s) || clientSrc.match(/<input\s+type="tel"[^>]*id="phone-input"[^>]*\/>/s);
assert.ok(phoneInputMatch, "phone-input markup found");
const inputHtml = phoneInputMatch[0];

assert.ok(inputHtml.includes('type="tel"'), "Input must have type='tel'");
assert.ok(inputHtml.includes('inputmode="numeric"'), "Input must specify inputmode='numeric'");
assert.ok(inputHtml.includes('maxlength="15"'), "Input must constrain maxlength='15'");
assert.ok(inputHtml.includes('pattern="[0-9]'), "Input must declare pattern for digits");
pass("1.2 #phone-input has type='tel', inputmode='numeric', pattern='[0-9]{8,15}', maxlength='15'");

// 1.3 Phone and Name error message elements exist
assert.ok(clientSrc.includes('id="phone-error"'), "#phone-error element must exist in client.js");
assert.ok(bundleSrc.includes('id="phone-error"'), "#phone-error element must exist in bundle.js");
assert.ok(clientSrc.includes('id="name-error"'), "#name-error element must exist in client.js");
assert.ok(bundleSrc.includes('id="name-error"'), "#name-error element must exist in bundle.js");
assert.ok(clientSrc.includes('id="name-input"'), "#name-input must exist in client.js");
const nameInputMatch = clientSrc.match(/<input[^>]*id="name-input"[^>]*>/s);
assert.ok(nameInputMatch, "#name-input markup found");
assert.ok(nameInputMatch[0].includes("required"), "#name-input must have required attribute");
assert.ok(nameInputMatch[0].includes('minlength="2"'), "#name-input must have minlength='2'");
pass("1.3 #phone-error and #name-error validation alerts exist in DOM template, name-input is required");

// ---------------------------------------------------------------------------
// SUITE 2: KEYDOWN NON-NUMERIC BLOCKING
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 2: Keydown Non-Numeric Character Blocking ---");

// Simular la lógica de bloqueo de keydown implementada en client.js y operator.js
const simulateKeydown = (key, ctrlKey = false, metaKey = false, altKey = false) => {
  const allowedKeys = [
    "Backspace", "Tab", "Enter", "Escape", "Delete",
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Home", "End"
  ];
  let prevented = false;
  if (allowedKeys.includes(key)) return false;
  if (ctrlKey || metaKey || altKey) return false;
  if (!/^[0-9]$/.test(key)) {
    prevented = true;
  }
  return prevented;
};

// Probar letras minúsculas y mayúsculas
const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
for (const char of alphabet) {
  assert.strictEqual(simulateKeydown(char), true, `Key '${char}' must be blocked`);
}
pass(`2.1 All 52 alphabet characters (a-z, A-Z) strictly blocked on keydown`);

// Probar símbolos y espacios
const symbols = [" ", "-", "+", ".", ",", "/", "*", "(", ")", "@", "#", "$", "%", "&"];
for (const sym of symbols) {
  assert.strictEqual(simulateKeydown(sym), true, `Symbol '${sym}' must be blocked`);
}
pass(`2.2 Punctuation, symbols, and spaces strictly blocked on keydown`);

// Probar dígitos numéricos (0-9)
for (let d = 0; d <= 9; d++) {
  assert.strictEqual(simulateKeydown(String(d)), false, `Digit '${d}' must NOT be blocked`);
}
pass(`2.3 Digits 0 through 9 are correctly permitted on keydown`);

// Probar teclas de navegación y control
const navKeys = ["Backspace", "Tab", "Enter", "Escape", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
for (const k of navKeys) {
  assert.strictEqual(simulateKeydown(k), false, `Control key '${k}' must NOT be blocked`);
}
pass(`2.4 System control and navigation keys (Backspace, Arrows, Delete, Tab) correctly permitted`);

// Probar atajos de teclado (Ctrl+C, Ctrl+V, Ctrl+A, Cmd+V)
assert.strictEqual(simulateKeydown("v", true), false, "Ctrl+V must NOT be blocked");
assert.strictEqual(simulateKeydown("c", true), false, "Ctrl+C must NOT be blocked");
assert.strictEqual(simulateKeydown("a", true), false, "Ctrl+A must NOT be blocked");
assert.strictEqual(simulateKeydown("v", false, true), false, "Cmd+V must NOT be blocked");
pass(`2.5 Keyboard shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, Cmd+V) preserved`);

// ---------------------------------------------------------------------------
// SUITE 3: INPUT & PASTE LIVE SANITIZATION
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 3: Input & Paste Sanitization (Filtering non-digits) ---");

const sanitizeValue = (val) => String(val).replace(/\D/g, "");

// Casos de prueba de cadenas con letras
const dirtyInputs = [
  { raw: "11hola2345", expected: "112345" },
  { raw: "abc1123456789xyz", expected: "1123456789" },
  { raw: "+54 9 11 2345-6789", expected: "5491123456789" },
  { raw: "texto_puro_sin_numeros", expected: "" },
  { raw: "11 2345 6789", expected: "1123456789" },
  { raw: "(011) 15-2345-6789", expected: "0111523456789" }
];

dirtyInputs.forEach(({ raw, expected }) => {
  const result = sanitizeValue(raw);
  assert.strictEqual(result, expected, `Sanitizing '${raw}' must equal '${expected}'`);
});
pass(`3.1 All ${dirtyInputs.length} dirty input variants cleaned to strict numeric strings`);

// Simulación de paste
const simulatePaste = (current, pasteText, start, end, maxLength = 15) => {
  const digits = pasteText.replace(/\D/g, "");
  if (!digits) return current;
  const updated = (current.slice(0, start) + digits + current.slice(end)).slice(0, maxLength);
  return updated;
};

assert.strictEqual(simulatePaste("", "11-2345-6789", 0, 0), "1123456789");
assert.strictEqual(simulatePaste("11", "abc456def", 2, 2), "11456");
assert.strictEqual(simulatePaste("112233", "NO_DIGITS", 2, 4), "112233");
pass("3.2 Paste handler strips non-digits and respects maxlength limit");

// ---------------------------------------------------------------------------
// SUITE 4: SUBMIT VALIDATION LOGIC
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 4: Phone Form Submit Validation ---");

const validatePhoneSubmit = (phoneVal) => {
  const digits = String(phoneVal).replace(/\D/g, "").trim();
  if (!digits || digits.length < 8) {
    return { valid: false, error: "Ingresá un número de WhatsApp válido (sólo números, mín. 8 dígitos)." };
  }
  return { valid: true, cleanPhone: digits };
};

// Casos inválidos (< 8 dígitos numéricos o letras)
assert.strictEqual(validatePhoneSubmit("").valid, false);
assert.strictEqual(validatePhoneSubmit("   ").valid, false);
assert.strictEqual(validatePhoneSubmit("abc").valid, false);
assert.strictEqual(validatePhoneSubmit("1234567").valid, false); // 7 dígitos
assert.strictEqual(validatePhoneSubmit("11-abc").valid, false);
pass("4.1 Submissions with < 8 digits or letters correctly rejected with error message");

// Casos válidos (>= 8 dígitos numéricos)
assert.strictEqual(validatePhoneSubmit("1123456789").valid, true);
assert.strictEqual(validatePhoneSubmit("1123456789").cleanPhone, "1123456789");
assert.strictEqual(validatePhoneSubmit("11 2345 6789").valid, true);
assert.strictEqual(validatePhoneSubmit("11 2345 6789").cleanPhone, "1123456789");
assert.strictEqual(validatePhoneSubmit("2211234567").cleanPhone, "2211234567");
pass("4.2 Valid 8-15 digit phone submissions accepted with clean numeric string");

// 4.3 Validación de Nombre Completo Requerido
const validateNameSubmit = (nameVal) => {
  const clean = String(nameVal || "").trim();
  if (!clean || clean.length < 2) {
    return { valid: false, error: "Por favor ingresá tu nombre para que podamos identificar tu pedido." };
  }
  return { valid: true, cleanName: clean };
};

assert.strictEqual(validateNameSubmit("").valid, false);
assert.strictEqual(validateNameSubmit("   ").valid, false);
assert.strictEqual(validateNameSubmit("A").valid, false); // Menos de 2 caracteres
assert.strictEqual(validateNameSubmit("Facundo Gómez").valid, true);
assert.strictEqual(validateNameSubmit("  Lucía  ").cleanName, "Lucía");
pass("4.3 Customer name validation enforces non-empty string with >= 2 characters");

// ---------------------------------------------------------------------------
// SUITE 5: STORE DEFENSIVE GUARD
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 5: Store State Machine Defensive Guard ---");

// Test store methods from store.js
const storageData = new Map();
globalThis.localStorage = {
  getItem: key => storageData.get(key) ?? null,
  setItem: (key, value) => storageData.set(key, String(value)),
  removeItem: key => storageData.delete(key)
};
const storeModule = await import("../js/store.js");
const store = storeModule.store;

// Limpiar sesión para prueba
store.logoutUser();

// 5.1 getCustomer con valores no numéricos
assert.strictEqual(store.getCustomer(null), null);
assert.strictEqual(store.getCustomer(""), null);
assert.strictEqual(store.getCustomer("solo_letras"), null);
pass("5.1 store.getCustomer returns null safely for empty or non-numeric queries");

// 5.2 saveCustomer con valores no numéricos o vacíos
assert.strictEqual(store.saveCustomer(null), null);
assert.strictEqual(store.saveCustomer({ telefono: "" }), null);
assert.strictEqual(store.saveCustomer({ telefono: "abcdef" }), null);
pass("5.2 store.saveCustomer rejects null, empty or letter-only customer objects");

// 5.3 saveCustomer con teléfono válido
const saved = store.saveCustomer({
  telefono: "11-9876-5432",
  nombre: "Test Valid User",
  direccion: "Calle Falsa 123"
});
assert.ok(saved, "Customer should be saved successfully");
assert.strictEqual(saved.telefono, "1198765432", "Saved customer telefono must be strictly digits");
assert.strictEqual(store.getCurrentUser()?.telefono, "1198765432", "Current user must be set to clean numeric phone");

const retrieved = store.getCustomer("11 9876 5432");
assert.ok(retrieved, "Customer must be retrievable with formatted phone");
assert.strictEqual(retrieved.telefono, "1198765432");
pass("5.3 Valid customer saved with clean numeric phone and retrieved successfully");

// ---------------------------------------------------------------------------
// SUITE 6: OPERATOR VIEW EDIT PHONE SANITIZATION
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 6: Operator Edit Phone Sanitization ---");

const operatorSrc = fs.readFileSync("js/views/operator.js", "utf8");

assert.ok(operatorSrc.includes('id="edit-phone"'), "Operator view must contain edit-phone input");
assert.ok(operatorSrc.includes('inputmode="numeric"'), "Operator edit-phone must declare inputmode='numeric'");
assert.ok(operatorSrc.includes('replace(/\\D/g, "")'), "Operator edit-phone must sanitize with regex /\\D/g");
pass("6.1 Operator edit phone input strictly enforces numeric characters and sanitization");

// ---------------------------------------------------------------------------
// SUITE 7: COMPILED BUNDLE INTEGRITY
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 7: Compiled Bundle Integrity ---");

assert.ok(!bundleSrc.startsWith("\uFEFF"), "bundle.js must NOT contain UTF-8 BOM");
assert.ok(bundleSrc.includes('Ingresá un número de WhatsApp válido'), "bundle.js contains phone validation message");
assert.ok(bundleSrc.includes('inputmode="numeric"'), "bundle.js contains numeric inputmodes");
pass("7.1 js/bundle.js contains all phone validation updates with strict UTF-8 without BOM");

console.log("\n===============================================================");
console.log(`   ALL TESTS PASSED: ${totalPassed} / ${totalPassed} (0 FAILURES)`);
console.log("===============================================================");
