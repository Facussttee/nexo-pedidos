import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const INITIAL_PRODUCTS = [
  { id: "prod-1",  nombre: "Banana Cavendish",             categoria: "Frutas",       unidad_medida: "KG",     precio: 1800, disponible: true, paso: 0.50 },
  { id: "prod-2",  nombre: "Manzana Roja Elegida",         categoria: "Frutas",       unidad_medida: "KG",     precio: 2200, disponible: true, paso: 0.50 },
  { id: "prod-3",  nombre: "Naranja de Jugo",              categoria: "Frutas",       unidad_medida: "KG",     precio: 1400, disponible: true, paso: 0.50 },
  { id: "prod-4",  nombre: "Limón Comercial",              categoria: "Frutas",       unidad_medida: "KG",     precio: 1600, disponible: true, paso: 0.25 },
  { id: "prod-5",  nombre: "Frutilla Seleccionada",        categoria: "Frutas",       unidad_medida: "KG",     precio: 4500, disponible: true, paso: 0.25 },
  { id: "prod-6",  nombre: "Palta Hass Madura",            categoria: "Frutas",       unidad_medida: "UNIDAD", precio: 1200, disponible: true, paso: 1.00 },
  { id: "prod-7",  nombre: "Papa Negra Cepillada",         categoria: "Verduras",     unidad_medida: "KG",     precio: 950, disponible: true, paso: 1.00 },
  { id: "prod-8",  nombre: "Cebolla Selección",            categoria: "Verduras",     unidad_medida: "KG",     precio: 1100, disponible: true, paso: 0.50 },
  { id: "prod-9",  nombre: "Tomate Redondo Premium",       categoria: "Verduras",     unidad_medida: "KG",     precio: 2600, disponible: true, paso: 0.50 },
  { id: "prod-10", nombre: "Zanahoria Fresca",             categoria: "Verduras",     unidad_medida: "KG",     precio: 1300, disponible: true, paso: 0.50 },
  { id: "prod-11", nombre: "Zapallito Verde Tronco",       categoria: "Verduras",     unidad_medida: "KG",     precio: 1700, disponible: true, paso: 0.50 },
  { id: "prod-12", nombre: "Calabaza Anco / Butternut",    categoria: "Verduras",     unidad_medida: "KG",     precio: 1100, disponible: true, paso: 1.00 },
  { id: "prod-13", nombre: "Acelga de Huerta (Atado)",     categoria: "Hojas Verdes", unidad_medida: "UNIDAD",  precio: 900, disponible: true, paso: 1.00 },
  { id: "prod-14", nombre: "Lechuga Mantecosa",            categoria: "Hojas Verdes", unidad_medida: "KG",     precio: 2800, disponible: true, paso: 0.25 },
  { id: "prod-15", nombre: "Espinaca Fresca (Atado)",      categoria: "Hojas Verdes", unidad_medida: "UNIDAD", precio: 1100, disponible: true, paso: 1.00 },
  { id: "prod-16", nombre: "Huevos de Campo (Maple x 30)", categoria: "Almacén",      unidad_medida: "UNIDAD", precio: 5200, disponible: true, paso: 1.00 },
  { id: "prod-17", nombre: "Huevos de Campo (Docena)",     categoria: "Almacén",      unidad_medida: "UNIDAD", precio: 2300, disponible: true, paso: 1.00 }
];

async function seed() {
  console.log("Cargando catálogo semilla en Supabase...");
  const { data, error } = await supabase.from("productos").upsert(INITIAL_PRODUCTS, { onConflict: "id" }).select();
  if (error) {
    console.error("Error al cargar productos:", error.message);
  } else {
    console.log(`[OK] ¡${data.length} productos cargados/sincronizados con éxito en la nube!`);
  }
}

seed();
