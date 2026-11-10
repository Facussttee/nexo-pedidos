# ==============================================================================
# Nexo Pedidos - Script de Empaquetado Autónomo (build-bundle.ps1)
# Genera js/bundle.js con codificación UTF-8 estricta SIN BOM y validación de sintaxis
# ==============================================================================

$ErrorActionPreference = "Stop"

# 1. Resolución dinámica de rutas relativas al script
$baseDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$jsDir = Join-Path $baseDir "js"
$viewsDir = Join-Path $jsDir "views"
$bundlePath = Join-Path $jsDir "bundle.js"

Write-Host "Iniciando compilacion de bundle en: $bundlePath"

# 2. Verificación de existencia de archivos fuente
$sourceFiles = @(
  (Join-Path $jsDir "products-data.js"),
  (Join-Path $jsDir "config.js"),
  (Join-Path $jsDir "demo-data.js"),
  (Join-Path $jsDir "html.js"),
  (Join-Path $jsDir "images.js"),
  (Join-Path $jsDir "csv-parser.js"),
  (Join-Path $jsDir "store.js"),
  (Join-Path $viewsDir "client.js"),
  (Join-Path $viewsDir "operator.js"),
  (Join-Path $viewsDir "admin.js"),
  (Join-Path $jsDir "app.js")
)

foreach ($file in $sourceFiles) {
  if (-not (Test-Path $file)) {
    throw "Error crítico: No se encontró el archivo requerido: $file"
  }
}

# 3. Lectura con UTF-8 estricto y despojamiento de módulos ESM

# 3.1 products-data.js
$prod = Get-Content (Join-Path $jsDir "products-data.js") -Raw -Encoding UTF8
$prod = $prod -replace '(?m)^\s*export\s+const\s+', 'const '

# 3.1b config.js (resolucion de config publica; la config en si vive en js/public-config.js, fuera del bundle)
$config = Get-Content (Join-Path $jsDir "config.js") -Raw -Encoding UTF8
$config = $config -replace '(?m)^\s*import\s+.*?;?\s*$', ''
$config = $config -replace '(?m)^\s*export\s*\{[^}\r\n]*\};?\s*$', ''

# 3.1c demo-data.js (datos sinteticos de demostracion)
$demoData = Get-Content (Join-Path $jsDir "demo-data.js") -Raw -Encoding UTF8
$demoData = $demoData -replace '(?m)^\s*import\s+.*?;?\s*$', ''
$demoData = $demoData -replace '(?m)^\s*export\s*\{[^}\r\n]*\};?\s*$', ''

# 3.1d html.js (funciones de escape HTML seguro)
$html = Get-Content (Join-Path $jsDir "html.js") -Raw -Encoding UTF8
$html = $html -replace '(?m)^\s*import\s+.*?;?\s*$', ''
$html = $html -replace '(?m)^\s*export\s+function\s+', 'function '
$html = $html -replace '(?m)^\s*export\s*\{[^}\r\n]*\};?\s*$', ''

# 3.1e images.js (modulo de imagenes IDB y procesamiento)
$images = Get-Content (Join-Path $jsDir "images.js") -Raw -Encoding UTF8
$images = $images -replace '(?m)^\s*import\s+.*?;?\s*$', ''
$images = $images -replace '(?m)^\s*export\s+const\s+', 'const '
$images = $images -replace '(?m)^\s*export\s+async\s+function\s+', 'async function '
$images = $images -replace '(?m)^\s*export\s+function\s+', 'function '
$images = $images -replace '(?m)^\s*export\s*\{[^}\r\n]*\};?\s*$', ''

# 3.1f csv-parser.js (parser RFC 4180 de CSV/TSV)
$csvParser = Get-Content (Join-Path $jsDir "csv-parser.js") -Raw -Encoding UTF8
$csvParser = $csvParser -replace '(?m)^\s*import\s+.*?;?\s*$', ''
$csvParser = $csvParser -replace '(?m)^\s*export\s+const\s+', 'const '
$csvParser = $csvParser -replace '(?m)^\s*export\s+function\s+', 'function '
$csvParser = $csvParser -replace '(?s)\bexport\s*\{[^}]*\};?', ''

# 3.2 store.js
$store = Get-Content (Join-Path $jsDir "store.js") -Raw -Encoding UTF8
$store = $store -replace '(?m)^\s*import\s+.*?;?\s*$', ''
$store = $store -replace 'export\s+const\s+store\s*=\s*new\s+Store\(\);', 'const store = new Store();'
$store = $store -replace '(?m)^\s*export\s*\{[^}\r\n]*\};?\s*$', ''

# 3.3 client.js
$client = Get-Content (Join-Path $viewsDir "client.js") -Raw -Encoding UTF8
$client = $client -replace '(?m)^\s*import\s+.*?;?\s*$', ''
$client = $client -replace 'export\s+function\s+renderClientView', 'function renderClientView'

# 3.4 operator.js
$operator = Get-Content (Join-Path $viewsDir "operator.js") -Raw -Encoding UTF8
$operator = $operator -replace '(?m)^\s*import\s+.*?;?\s*$', ''
$operator = $operator -replace 'export\s+function\s+renderOperatorView', 'function renderOperatorView'

# 3.5 admin.js
$admin = Get-Content (Join-Path $viewsDir "admin.js") -Raw -Encoding UTF8
$admin = $admin -replace '(?m)^\s*import\s+.*?;?\s*$', ''
$admin = $admin -replace 'export\s+function\s+renderAdminView', 'function renderAdminView'

# 3.6 app.js
$app = Get-Content (Join-Path $jsDir "app.js") -Raw -Encoding UTF8
$app = $app -replace '(?m)^\s*import\s+.*?;?\s*$', ''
$app = $app -replace 'document\.addEventListener\("DOMContentLoaded",\s*\(\)\s*=>\s*\{\s*new App\(\);\s*\}\);?', @'
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new App());
} else {
  new App();
}
'@

# 4. Ensamble secuencial dentro de IIFE
$parts = @(
  "(function () {`n  `"use strict`";`n",
  "  // ==========================================",
  "  // 1. CATALOGO DE PRODUCTOS",
  "  // ==========================================",
  $prod.Trim(),
  "  // ==========================================",
  "  // 1b. CONFIGURACION PUBLICA Y DATOS DEMO SINTETICOS",
  "  // ==========================================",
  $config.Trim(),
  $demoData.Trim(),
  "  // ==========================================",
  "  // 1c. UTILIDADES DE ESCAPADO HTML SEGURO",
  "  // ==========================================",
  $html.Trim(),
  "  // ==========================================",
  "  // 1d. MODULO DE IMAGENES INDEXEDDB",
  "  // ==========================================",
  $images.Trim(),
  "  // ==========================================",
  "  // 1e. PARSER CSV/TSV DE CATALOGO",
  "  // ==========================================",
  $csvParser.Trim(),
  "  // ==========================================",
  "  // 2. STORE Y PERSISTENCIA LOCAL + SUPABASE",
  "  // ==========================================",
  $store.Trim(),
  "  // ==========================================",
  "  // 3. VISTA CLIENTE",
  "  // ==========================================",
  $client.Trim(),
  "  // ==========================================",
  "  // 4. VISTA OPERARIO (BALANZA Y MOSTRADOR)",
  "  // ==========================================",
  $operator.Trim(),
  "  // ==========================================",
  "  // 5. VISTA ADMIN / DUENO",
  "  // ==========================================",
  $admin.Trim(),
  "  // ==========================================",
  "  // 6. ENRUTADOR Y CONTROL DE ACCESO POR PIN",
  "  // ==========================================",
  $app.Trim(),
  "})();`n"
)

$bundleContent = (($parts -join "`r`n`r`n") -replace "[ \t]+(\r?\n)", '$1') -replace "\r?\n", "`r`n"

# 5. Validación de integridad: asegurar que no queden declaraciones import/export residuales
$residualImports = [regex]::Matches($bundleContent, '(?m)^\s*import\s+.*?$')
if ($residualImports.Count -gt 0) {
  throw "Error de compilacion: Se detectaron $($residualImports.Count) clausulas 'import' residuales en el bundle."
}

$residualExports = [regex]::Matches($bundleContent, '(?m)^\s*export\s+.*?$')
if ($residualExports.Count -gt 0) {
  throw "Error de compilacion: Se detectaron $($residualExports.Count) clausulas 'export' residuales en el bundle."
}

if ($bundleContent.Length -lt 50000) {
  throw "Error de compilacion: El tamano del bundle es sospechosamente bajo ($($bundleContent.Length) caracteres)."
}

# 6. Escritura con UTF-8 Estricto SIN BOM (escritura atomica via archivo temporal)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$tempPath = "$bundlePath.tmp"
[System.IO.File]::WriteAllText($tempPath, $bundleContent, $utf8NoBom)
Move-Item -Path $tempPath -Destination $bundlePath -Force

# 7. Verificación de firma de bytes (asegurar que los primeros bytes sean '(function' y NO 0xEF 0xBB 0xBF)
$bytes = [System.IO.File]::ReadAllBytes($bundlePath)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
  throw "Error de codificacion: El archivo bundle.js contiene un BOM no deseado."
}

Write-Host "[OK] Bundle generado exitosamente con UTF-8 estricto SIN BOM." -ForegroundColor Green
Write-Host "   Ruta: $bundlePath"
Write-Host "   Tamano: $($bytes.Length) bytes ($($bundleContent.Length) caracteres)"
Write-Host "   Primeros bytes: $([System.Text.Encoding]::ASCII.GetString($bytes[0..15]))"
