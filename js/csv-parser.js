/**
 * Nexo Pedidos - Parser RFC 4180 de CSV/TSV para importación de catálogo.
 * Pure JS sin dependencias externas.
 */

const HEADER_ALIASES = {
  sku: ["sku", "codigo", "código", "cod", "cód", "id"],
  nombre: ["nombre", "producto", "descripcion_corta", "descripción_corta", "item", "title", "titulo", "título"],
  categoria: ["categoria", "categoría", "rubro", "seccion", "sección"],
  precio: ["precio", "precio_unitario", "valor", "costo", "price"],
  unidad: ["unidad", "tipo_venta", "medida", "unidad_medida", "unit"],
  disponible: ["disponible", "activo", "habilitado", "available", "enabled"],
  descripcion: ["descripcion", "descripción", "detalle", "description"],
  imagen_url: ["imagen_url", "imagen", "foto", "image", "image_url"]
};

/**
 * Normaliza una cadena de texto eliminando acentos básicos y convirtiendo a minúsculas.
 */
function normalizeHeaderString(str) {
  if (typeof str !== "string") return "";
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Mapea el encabezado en crudo al nombre canónico reconocido.
 */
function normalizeHeader(rawHeader) {
  if (typeof rawHeader !== "string") return null;
  const rawClean = rawHeader.trim().toLowerCase();
  const normalized = normalizeHeaderString(rawHeader);

  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      if (rawClean === alias || normalized === normalizeHeaderString(alias)) {
        return canonical;
      }
    }
  }
  return null;
}

/**
 * Detecta el delimitador (, ; o \t) analizando la primera línea del archivo respetando comillas.
 */
function detectDelimiter(text) {
  if (typeof text !== "string" || !text) return ",";

  let inQuotes = false;
  const counts = { ",": 0, ";": 0, "\t": 0 };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        i++; // escapar comilla doble
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes) {
      if (ch === "\r" || ch === "\n") {
        break; // fin del primer registro/encabezado
      }
      if (ch === "," || ch === ";" || ch === "\t") {
        counts[ch]++;
      }
    }
  }

  let bestDelimiter = ",";
  let maxCount = 0;
  for (const d of [",", ";", "\t"]) {
    if (counts[d] > maxCount) {
      maxCount = counts[d];
      bestDelimiter = d;
    }
  }

  return bestDelimiter;
}

/**
 * Parsea un texto CSV/TSV conforme a RFC 4180 en una lista de registros y campos.
 */
function parseCsvRecords(text, delimiter = ",") {
  if (typeof text !== "string") return [];

  const records = [];
  let currentRecord = [];
  let field = "";
  let inQuotes = false;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          field += '"';
          i++; // comilla escapada dentro de campo entrecomillado
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRecord.push(field);
        field = "";
      } else if (ch === "\r") {
        if (i + 1 < len && text[i + 1] === "\n") {
          i++; // consumir CRLF como único salto de línea
        }
        currentRecord.push(field);
        records.push(currentRecord);
        currentRecord = [];
        field = "";
      } else if (ch === "\n") {
        currentRecord.push(field);
        records.push(currentRecord);
        currentRecord = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }

  // Si quedó un último registro o campo pendiente al final del archivo
  if (field.length > 0 || currentRecord.length > 0) {
    currentRecord.push(field);
    records.push(currentRecord);
  }

  // Filtrar fila vacía al final si el archivo terminaba con salto de línea
  if (records.length > 0) {
    const last = records[records.length - 1];
    if (last.length === 1 && last[0].trim() === "") {
      records.pop();
    }
  }

  return records;
}

/**
 * Parsea un valor numérico de precio tolerando $, separadores de miles y coma decimal.
 */
function parsePrice(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string") return null;

  let str = value.trim();
  if (!str) return null;

  // Quitar símbolos monetarios comunes y espacios
  str = str.replace(/[$€\s]/g, "");
  if (!str) return null;

  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastDot > lastComma) {
      // Formato US 1,500.50 -> quitar coma
      str = str.replace(/,/g, "");
    } else {
      // Formato AR/EU 1.500,50 -> quitar punto y cambiar coma por punto
      str = str.replace(/\./g, "").replace(",", ".");
    }
  } else if (hasComma) {
    // Formato decimal con coma: 1500,50 -> cambiar coma por punto
    str = str.replace(",", ".");
  } else if (hasDot) {
    // Si tiene sólo punto y tiene formato de miles argentino/europeo (ej: 2.300, 15.000 o 1.500.000)
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
      str = str.replace(/\./g, "");
    }
  }

  const num = Number(str);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/**
 * Parsea la modalidad de venta ('UNIDAD' o 'KG').
 */
function parseUnit(value) {
  if (typeof value !== "string") return "UNIDAD";
  const str = value.trim().toUpperCase();
  if (str === "KG" || str.startsWith("KILO") || str === "K") {
    return "KG";
  }
  return "UNIDAD";
}

/**
 * Parsea el valor booleano de disponibilidad.
 */
function parseDisponible(value) {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value === "boolean") return value;
  const str = String(value).trim().toLowerCase();
  if (["si", "sí", "s", "true", "1", "activo", "habilitado", "yes", "y"].includes(str)) {
    return true;
  }
  if (["no", "n", "false", "0", "inactivo", "pausado", "deshabilitado"].includes(str)) {
    return false;
  }
  return true;
}

/**
 * Parsea un archivo de catálogo completo (CSV/TSV/TXT) y devuelve registros normalizados y errores.
 *
 * @param {string} text Contenido del archivo en texto plano.
 * @returns {{ rows: Array<object>, errors: Array<object>, headers: Array<string> }}
 */
function parseCatalogFile(text) {
  if (typeof text !== "string" || !text.trim()) {
    return {
      rows: [],
      errors: [{ row: 1, raw: "", error: "El archivo está vacío." }],
      headers: []
    };
  }

  const delimiter = detectDelimiter(text);
  const records = parseCsvRecords(text, delimiter);

  if (records.length === 0) {
    return {
      rows: [],
      errors: [{ row: 1, raw: "", error: "No se encontraron registros en el archivo." }],
      headers: []
    };
  }

  const rawHeaders = records[0];
  const headerMap = {};
  rawHeaders.forEach((h, index) => {
    const canonical = normalizeHeader(h);
    if (canonical && !(canonical in headerMap)) {
      headerMap[canonical] = index;
    }
  });

  // El campo nombre es obligatorio en el encabezado
  if (!("nombre" in headerMap)) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          raw: rawHeaders.join(delimiter),
          error: "Falta la columna obligatoria de nombre ('nombre', 'producto', 'item', 'title')."
        }
      ],
      headers: rawHeaders
    };
  }

  const rows = [];
  const errors = [];

  for (let i = 1; i < records.length; i++) {
    const record = records[i];
    const rowNum = i + 1; // 1-indexed, fila 2 es la primera de datos

    // Omitir filas completamente vacías
    if (record.length === 0 || (record.length === 1 && record[0].trim() === "")) {
      continue;
    }

    const rawRow = record.join(delimiter);

    const getField = (canonical) => {
      const idx = headerMap[canonical];
      return idx !== undefined && idx < record.length ? record[idx] : "";
    };

    const rawSku = getField("sku");
    const rawNombre = getField("nombre");
    const rawCategoria = getField("categoria");
    const rawPrecio = getField("precio");
    const rawUnidad = getField("unidad");
    const rawDisponible = getField("disponible");
    const rawDescripcion = getField("descripcion");
    const rawImagen = getField("imagen_url");

    // SKU: conservar como string recortado sin transformar a número (mantiene ceros iniciales)
    const sku = typeof rawSku === "string" ? rawSku.trim() : (rawSku != null ? String(rawSku).trim() : "");

    // Nombre: obligatorio
    const nombre = typeof rawNombre === "string" ? rawNombre.trim() : "";
    if (!nombre) {
      errors.push({
        row: rowNum,
        raw: rawRow,
        error: "El nombre del producto es obligatorio."
      });
      continue;
    }

    // Precio: obligatorio y no negativo
    const precio = parsePrice(rawPrecio);
    if (precio === null) {
      errors.push({
        row: rowNum,
        raw: rawRow,
        error: `Precio inválido: '${rawPrecio}'. Debe ser un número mayor o igual a cero.`
      });
      continue;
    }

    // Categoría: por defecto "General"
    const categoria = (typeof rawCategoria === "string" && rawCategoria.trim()) ? rawCategoria.trim() : "General";

    // Unidad: 'UNIDAD' o 'KG'
    const unidad_medida = parseUnit(rawUnidad);

    // Disponible: booleano
    const disponible = parseDisponible(rawDisponible);

    // Descripción: opcional
    const detalle = typeof rawDescripcion === "string" ? rawDescripcion.trim() : "";

    // Imagen: opcional
    const imagen_url = typeof rawImagen === "string" && rawImagen.trim() ? rawImagen.trim() : null;

    rows.push({
      sku,
      codigo: sku,
      nombre,
      categoria,
      precio,
      unidad_medida,
      disponible,
      detalle,
      descripcion: detalle,
      imagen_url
    });
  }

  return {
    rows,
    errors,
    headers: rawHeaders
  };
}

// Alias para compatibilidad
const parseCatalogCsv = parseCatalogFile;

export {
  HEADER_ALIASES,
  normalizeHeader,
  detectDelimiter,
  parseCsvRecords,
  parsePrice,
  parseUnit,
  parseDisponible,
  parseCatalogFile,
  parseCatalogCsv
};
