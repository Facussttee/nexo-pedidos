/**
 * Nexo Pedidos — Script de Pruebas de Carga con Grafana k6
 * Archivo: tests/load/static-server-load.js
 *
 * Simula tráfico concurrente de clientes sobre los activos públicos servidos
 * por `bot/serve-demo.js` (o Vercel/CDN) en `dist/public`:
 *  - Carga de HTML principal (`index.html`)
 *  - Estilos CSS (`css/style.css`)
 *  - Configuración pública cliente (`js/public-config.js`)
 *  - Bundle JavaScript compilado (~260 KB) (`js/bundle.js`)
 *  - Pruebas adversariales de confinamiento bajo carga (403/404 esperados, 0 fugas)
 *
 * Ejecución básica:
 *   k6 run tests/load/static-server-load.js
 *
 * Con URL personalizada:
 *   k6 run -e TARGET_URL="http://127.0.0.1:3000" tests/load/static-server-load.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// --- Métricas personalizadas ---
const bundleDownloadTime = new Trend('nexo_bundle_download_ms');
const htmlDownloadTime = new Trend('nexo_html_download_ms');
const assetSuccessRate = new Rate('nexo_asset_success_rate');
const confinementLeaks = new Counter('nexo_confinement_leak_count');

// --- Configuración de ejecución y umbrales (SLA) ---
export const options = {
  stages: [
    { duration: '15s', target: 10 }, // Calentamiento: subir a 10 VUs
    { duration: '30s', target: 30 }, // Carga sostenida: 30 usuarios simultáneos
    { duration: '15s', target: 60 }, // Pico de tráfico: 60 usuarios simultáneos
    { duration: '15s', target: 0 },  // Descenso y estabilización
  ],
  thresholds: {
    // El 95% de todas las peticiones a activos públicos debe responder en menos de 150 ms
    'http_req_duration{expected_result:true}': ['p(95)<150', 'p(99)<300'],
    // Tasa general de fallos HTTP inesperados menor al 1%
    'http_req_failed{expected_result:true}': ['rate<0.01'],
    // Tasa de éxito en verificación de activos debe ser superior al 99%
    'nexo_asset_success_rate': ['rate>0.99'],
    // Tolerancia cero a fugas de confinamiento bajo concurrencia
    'nexo_confinement_leak_count': ['count==0'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:3000';

export default function () {
  // 1. Grupo: Carga inicial de la aplicación (HTML)
  group('01 - Carga de Index HTML', function () {
    const resHtml = http.get(`${BASE_URL}/`, {
      tags: { asset_type: 'html', expected_result: 'true' }
    });

    htmlDownloadTime.add(resHtml.timings.duration);

    const isHtmlOk = check(resHtml, {
      'HTML status es 200': (r) => r.status === 200,
      'Content-Type es text/html': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('text/html'),
      'Contiene tag nexo-pedidos o viewport': (r) => r.body && (r.body.includes('viewport') || r.body.includes('Nexo')),
    });

    assetSuccessRate.add(isHtmlOk);
  });

  // Pequeña pausa natural del navegador (100-300ms) antes de pedir los assets vinculados
  sleep(0.2);

  // 2. Grupo: Descarga en paralelo de recursos estáticos críticos
  group('02 - Recursos Críticos (CSS y JS Config)', function () {
    const responses = http.batch([
      ['GET', `${BASE_URL}/css/style.css`, null, { tags: { asset_type: 'css', expected_result: 'true' } }],
      ['GET', `${BASE_URL}/js/public-config.js`, null, { tags: { asset_type: 'config', expected_result: 'true' } }],
    ]);

    const [resCss, resConfig] = responses;

    const isCssOk = check(resCss, {
      'CSS status es 200': (r) => r.status === 200,
      'CSS Content-Type es text/css': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('text/css'),
    });

    const isConfigOk = check(resConfig, {
      'Config status es 200': (r) => r.status === 200,
      'Config Content-Type es javascript': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('javascript'),
    });

    assetSuccessRate.add(isCssOk && isConfigOk);
  });

  // 3. Grupo: Descarga del Bundle Modular Principal (~260 KB)
  group('03 - Bundle Modular Principal', function () {
    const resBundle = http.get(`${BASE_URL}/js/bundle.js`, {
      tags: { asset_type: 'bundle', expected_result: 'true' }
    });

    bundleDownloadTime.add(resBundle.timings.duration);

    const isBundleOk = check(resBundle, {
      'Bundle status es 200': (r) => r.status === 200,
      'Bundle Content-Type es javascript': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('javascript'),
      'Tamaño del bundle > 200 KB': (r) => r.body && r.body.length > 200000,
    });

    assetSuccessRate.add(isBundleOk);
  });

  // 4. Grupo: Verificación de Confinamiento y Seguridad bajo Carga
  // (Verifica que peticiones no autorizadas NO devuelvan 200 ni cuelguen el event-loop)
  group('04 - Confinamiento y Seguridad bajo Carga', function () {
    const adversarialRequests = [
      `${BASE_URL}/package.json`,
      `${BASE_URL}/bot/index.js`,
      `${BASE_URL}/.env`,
      `${BASE_URL}/../package.json`,
      `${BASE_URL}/%2e%2e/bot/index.js`
    ];

    for (const url of adversarialRequests) {
      const res = http.get(url, {
        tags: { asset_type: 'adversarial', expected_result: 'false' }
      });

      const leaked = check(res, {
        'Archivo sensible NO es accesible (no es 200)': (r) => r.status !== 200,
        'Retorna 403 Forbidden o 404 Not Found': (r) => r.status === 403 || r.status === 404,
      });

      if (!leaked) {
        confinementLeaks.add(1);
      }
    }
  });

  // Simulación de tiempo entre interacciones del cliente (1 a 2 segundos)
  sleep(1.5);
}
