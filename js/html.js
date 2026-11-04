/**
 * Escapa caracteres especiales de HTML (&, <, >, ", ') para prevenir inyección de código.
 * Si el valor es null o undefined, retorna cadena vacía "".
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const str = String(value);
    return str.replace(/[&<>"']/g, (char) => {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return char;
        }
    });
}

/**
 * Alias semántico para atributos HTML.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeAttr(value) {
    return escapeHtml(value);
}
