# Uso móvil de Nexo

## Iniciar en la red local

Desde D:\Escritorio\nexo-pedidos:

```powershell
node bot/serve-demo.js --host 0.0.0.0 --port 3000
```

Abrir `http://IP_DE_TU_PC:3000/?demo=1` desde un dispositivo en la misma red. Dejar encendida la PC y la terminal. Para detener, Ctrl+C. El servidor publica sólo dist/public y no inicia el bot. No abrir puertos del router para esta prueba.

## Catálogo y pedidos

Búsqueda/categorías permanecen visibles al desplazarse. Las tarjetas usan dos columnas desde 360 px y una en pantallas menores. La barra inferior abre el carrito cuando hay productos. Cerrar con botón, fondo, Escape o arrastre hacia abajo desde el tirador/encabezado libre; desplazar la lista no debe cerrarlo. Cerrar conserva el borrador.

Mis pedidos muestra En curso e Historial; tocar una fila abre ese pedido. Volver al catálogo permite crear otro. Los pedidos y las fotos siguen siendo locales al navegador: esta mejora no implementa sincronización entre dispositivos ni autenticación real.

## Fotos y precios

En Precios → Editar o Nuevo producto, usar Agregar foto. Elegir una imagen y esperar que termine Procesando. Guardar confirma los cambios; Cancelar conserva el producto y su imagen previa. Quitar permite guardar el producto sin imagen. Durante el guardado el formulario queda bloqueado; un error lo habilita para reintentar.

Entrada de hasta 15 MiB y 25 megapíxeles. JPEG/PNG/WebP; HEIC sólo si el navegador lo decodifica, de lo contrario elegir JPEG/PNG. Se reduce a un máximo de 512 px sin ampliar y se guarda como JPEG de hasta 512 KiB. La transparencia se convierte a fondo blanco. No hay subida a servicios externos.

Los cambios de precio conservan la imagen. Las fotos faltantes no bloquean el catálogo. Para editar disponibilidad o archivar/restaurar, abrir Editar; el precio también admite edición directa en la tarjeta.

## Comprobar en iPhone 13 Pro

1. Probar vertical con las barras de Safari expandidas y retraídas: filtros visibles y dos productos por fila.
2. Buscar, cambiar categoría y abrir el teclado sin que se tapen las acciones.
3. Abrir/cerrar carrito por botón y gesto; cancelar el gesto y desplazar la lista; revisar cantidades/dirección conservadas.
4. Crear dos pedidos ficticios y consultar ambos desde Mis pedidos; preparar uno desde Operario y revisar su estado.
5. Cargar una foto de prueba, comprobar orientación, reemplazar, quitar y recargar. Probar también el selector de galería/cámara que ofrezca Safari.
6. Girar el teléfono y volver; revisar el teclado de dirección y precio.

Usar datos sintéticos. WhatsApp continúa simulado. Borrar datos del navegador o cambiar de IP/puerto cambia el acceso al almacenamiento local; conservar las fotos originales fuera de la app.

## Pruebas reproducibles

Las pruebas de navegador requieren Playwright y Brave del entorno de QA; no son requisito para abrir la demo.

```powershell
node tests/test-iphone-13-pro-layout.test.mjs
node tests/test-iphone-13-pro-layout.test.mjs --dark
node coordination/reviews/images-acceptance.cjs --root . --out coordination/reviews/images-local.json
```

La primera prueba ahora verifica el navegador real con tamaños emulados, no cadenas de HTML que exigían el antiguo botón duplicado. Ninguna de estas pruebas equivale a Safari físico.
