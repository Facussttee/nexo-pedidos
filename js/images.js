export const IMAGE_DB_NAME = "nexo_demo_images_v1";
export const IMAGE_STORE_NAME = "images";
export const IMAGE_DB_VERSION = 1;

export const MAX_INPUT_FILE_SIZE = 15 * 1024 * 1024;
export const MAX_DECODED_PIXELS = 25_000_000;
export const MAX_IMAGE_SIDE = 512;
export const MAX_OUTPUT_SIZE = 512 * 1024;
export const ALLOWED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

function openImageDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no está disponible en este entorno."));
      return;
    }
    const request = indexedDB.open(IMAGE_DB_NAME, IMAGE_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Error al abrir IndexedDB"));
  });
}

export function generateImageId() {
  const rnd = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `img_${time}_${rnd}`;
}

export async function putImage(blob, explicitId = null) {
  if (!(blob instanceof Blob)) {
    throw new TypeError("putImage requiere una instancia de Blob.");
  }
  const id = explicitId || generateImageId();
  const db = await openImageDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = tx.objectStore(IMAGE_STORE_NAME);
    const request = store.put(blob, id);
    tx.oncomplete = () => {
      db.close();
      resolve(id);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || request.error || new Error("Error en la transacción IndexedDB"));
    };
    tx.onabort = () => {
      db.close();
      reject(new Error("Transacción IndexedDB abortada"));
    };
  });
}

export async function getImage(id) {
  if (!id || typeof id !== "string") return null;
  try {
    const db = await openImageDatabase();
    return await new Promise((resolve) => {
      const tx = db.transaction(IMAGE_STORE_NAME, "readonly");
      const store = tx.objectStore(IMAGE_STORE_NAME);
      const request = store.get(id);
      tx.oncomplete = () => {
        db.close();
        resolve(request.result || null);
      };
      tx.onerror = () => {
        db.close();
        resolve(null);
      };
      tx.onabort = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function deleteImage(id) {
  if (!id || typeof id !== "string") return false;
  try {
    const db = await openImageDatabase();
    return await new Promise((resolve) => {
      const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
      const store = tx.objectStore(IMAGE_STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
      tx.onabort = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

export async function processProductImageFile(file) {
  if (!file) throw new Error("No se seleccionó ningún archivo de imagen.");
  if (file.size > MAX_INPUT_FILE_SIZE) {
    throw new Error("El archivo de imagen excede el tamaño máximo permitido (15 MB).");
  }

  const type = (file.type || "").toLowerCase().trim();
  const name = (file.name || "").toLowerCase();
  const isHeic = type === "image/heic" || type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");

  if (type.includes("svg") || type.includes("html") || type.includes("xml")) {
    throw new Error("Formato de imagen no compatible. Seleccioná una imagen JPEG, PNG o WebP.");
  }

  if (!isHeic && !ALLOWED_MIME_TYPES.includes(type)) {
    throw new Error("Formato de imagen no compatible. Seleccioná una imagen JPEG, PNG o WebP.");
  }

  let imgSource;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let objectUrlToRevoke = null;

  try {
    if (typeof createImageBitmap === "function") {
      try {
        imgSource = await createImageBitmap(file, { imageOrientation: "from-image" });
        sourceWidth = imgSource.width;
        sourceHeight = imgSource.height;
      } catch (bitmapErr) {
        if (isHeic) {
          throw new Error("No se pudo decodificar la imagen HEIC/HEIF en este navegador. Por favor convertila a JPEG o PNG.");
        }
      }
    }

    if (!imgSource) {
      objectUrlToRevoke = URL.createObjectURL(file);
      imgSource = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          if (isHeic) {
            reject(new Error("No se pudo decodificar la imagen HEIC/HEIF en este navegador. Por favor convertila a JPEG o PNG."));
          } else {
            reject(new Error("No se pudo decodificar el archivo de imagen. Verificá que no esté corrupto."));
          }
        };
        img.src = objectUrlToRevoke;
      });
      sourceWidth = imgSource.naturalWidth || imgSource.width;
      sourceHeight = imgSource.naturalHeight || imgSource.height;
    }

    if (!sourceWidth || !sourceHeight) {
      throw new Error("No se pudieron determinar las dimensiones de la imagen.");
    }

    const totalPixels = sourceWidth * sourceHeight;
    if (totalPixels > MAX_DECODED_PIXELS) {
      throw new Error("La resolución de la imagen excede los 25 megapíxeles permitidos.");
    }

    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;
    if (sourceWidth > MAX_IMAGE_SIDE || sourceHeight > MAX_IMAGE_SIDE) {
      const scale = Math.min(MAX_IMAGE_SIDE / sourceWidth, MAX_IMAGE_SIDE / sourceHeight);
      targetWidth = Math.max(1, Math.round(sourceWidth * scale));
      targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo inicializar el lienzo para procesar la imagen.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(imgSource, 0, 0, targetWidth, targetHeight);

    const normalizedBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Error al normalizar la imagen a formato JPEG."));
          else resolve(blob);
        },
        "image/jpeg",
        0.8
      );
    });

    if (normalizedBlob.size > MAX_OUTPUT_SIZE) {
      throw new Error("El archivo de imagen normalizado supera los 512 KB permitidos.");
    }

    return normalizedBlob;
  } finally {
    if (imgSource && typeof imgSource.close === "function") {
      imgSource.close();
    }
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}

export function isDirectImageUrl(id) {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  return trimmed.startsWith("https://");
}

export function createScopedImageLoader() {
  const activeUrls = new Set();
  let generation = 0;

  return {
    async hydrate(element, imageId) {
      if (!element || !imageId) return;
      const currentGen = generation;
      const trimmedId = imageId.trim();

      // Carga directa de URL pública HTTP/HTTPS (Supabase Storage, CDN, Unsplash, etc.)
      if (isDirectImageUrl(trimmedId)) {
        const wrapper = element.closest(".product-photo-wrapper") || element.closest(".aspect-square");
        element.src = trimmedId;
        element.alt = "";
        element.loading = "lazy";
        element.decoding = "async";
        element.classList.remove("hidden");
        if (wrapper) wrapper.classList.remove("hidden");

        element.onerror = () => {
          element.classList.add("hidden");
          if (wrapper) wrapper.classList.add("hidden");
        };
        return;
      }

      // Carga local desde IndexedDB
      const blob = await getImage(imageId);
      if (currentGen !== generation || !element.isConnected) return;

      const wrapper = element.closest(".product-photo-wrapper") || element.closest(".aspect-square");
      if (!blob) {
        element.classList.add("hidden");
        if (wrapper) wrapper.classList.add("hidden");
        return;
      }

      try {
        const url = URL.createObjectURL(blob);
        if (currentGen !== generation || !element.isConnected) {
          URL.revokeObjectURL(url);
          return;
        }
        activeUrls.add(url);
        element.src = url;
        element.alt = "";
        element.loading = "lazy";
        element.decoding = "async";
        element.classList.remove("hidden");
        if (wrapper) wrapper.classList.remove("hidden");

        element.onerror = () => {
          element.classList.add("hidden");
          if (wrapper) wrapper.classList.add("hidden");
        };
      } catch {
        element.classList.add("hidden");
        if (wrapper) wrapper.classList.add("hidden");
      }
    },
    revokeAll() {
      generation++;
      for (const url of activeUrls) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      activeUrls.clear();
    }
  };
}
