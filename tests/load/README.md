# Pruebas de Rendimiento y Carga con Grafana k6 en Nexo Pedidos

Este directorio contiene los escenarios de prueba de carga, estrés y límites de concurrencia usando [Grafana k6](https://github.com/grafana/k6).

---

## 🚀 1. Instalación de k6 (en Windows)

Si no tienes `k6` instalado en tu sistema, puedes instalarlo con cualquiera de estos métodos:

### Opción A: Vía Chocolatey (Recomendada en este equipo)
Abre PowerShell como Administrador y ejecuta:
```powershell
choco install k6 -y
```

### Opción B: Vía instalador MSI oficial
Descarga el instalador de Windows desde los releases oficiales de Grafana:
[https://github.com/grafana/k6/releases](https://github.com/grafana/k6/releases) (buscar `k6-vX.Y.Z-amd64.msi`).

### Opción C: Vía Docker
```powershell
docker run --rm -i -v ${PWD}:/work -w /work grafana/k6 run tests/load/static-server-load.js
```

Verifica la instalación con:
```powershell
k6 version
```

---

## 🛠️ 2. Ejecución del Escenario Inicial (`static-server-load.js`)

Este script prueba la capacidad del servidor HTTP estático confinado (`bot/serve-demo.js` o CDN) para despachar los activos de `dist/public`:
- `index.html` (HTML inicial de la PWA)
- `css/style.css` (estilos móviles)
- `js/public-config.js` (configuración cliente)
- `js/bundle.js` (bundle modular de ~260 KB)
- **Confinamiento adversarial bajo carga**: asegura que con 60 usuarios concurrentes, intentos de acceso a `package.json`, `.env` o traversals sigan devolviendo estrictamente `403` o `404` sin fugas de memoria ni degradación.

### Paso 1: Iniciar el servidor demo aislado en una terminal
```powershell
node bot/serve-demo.js --host 127.0.0.1 --port 3000
```

### Paso 2: Ejecutar la prueba de carga en otra terminal
```powershell
# Ejecución estándar (etapas progresivas de 10 a 60 usuarios virtuales durante ~1 minuto)
k6 run tests/load/static-server-load.js

# Prueba rápida tipo Smoke Test (5 usuarios durante 10 segundos)
k6 run --vus 5 --duration 10s tests/load/static-server-load.js

# Apuntar a otra URL o puerto (ej. staging o puerto alternativo)
k6 run -e TARGET_URL="http://127.0.0.1:3000" tests/load/static-server-load.js
```

---

## 📊 3. Métricas y Umbrales Clave

Al finalizar la prueba, k6 reporta:
- `http_req_duration`: Percentiles p(90), p(95), p(99) de tiempo de respuesta (el umbral exige p(95) < 150ms).
- `nexo_bundle_download_ms`: Tiempo específico de transferencia del bundle compilado.
- `nexo_confinement_leak_count`: Contador de fugas de seguridad (debe ser estrictamente 0).
- `nexo_asset_success_rate`: Porcentaje de recursos descargados con integridad (> 99%).
