# 03 - Arquitectura del Sistema y Modelo de Datos

Este documento detalla la arquitectura técnica, las especificaciones del modelo de base de datos relacional y la estrategia de infraestructura de costo cero (\$0/mes) para **Mi Huerta**.

---

## 1. Arquitectura General del Sistema

La solución adopta un patrón **JAMstack + Backend-as-a-Service (BaaS) en Tiempo Real**, diseñado para ser ultra-liviano, escalable y 100% gratuito en volúmenes de comercio minorista barrial.

```mermaid
flowchart TD
    subgraph ClienteExt["Canal WhatsApp (Externo)"]
        ClienteWA["Cliente"]
    end

    subgraph BotService["Microservicio Bot (Node.js / Baileys)"]
        Bot["Conector WhatsApp Web"]
    end

    subgraph CloudBaaS["Supabase Cloud (PostgreSQL + Realtime Engine)"]
        DB[("PostgreSQL")]
        RealtimeEngine["Motor WebSockets (Realtime)"]
        DB <--> RealtimeEngine
    end

    subgraph PWAFrontend["Aplicación Web PWA (Hosting Vercel)"]
        ClientView["Catálogo Cliente (/pedido)"]
        OperatorView["Mostrador & Balanza (/mostrador)"]
        AdminView["Panel de Precios (/admin)"]
    end

    ClienteWA <-->|1. Pide link por chat| Bot
    Bot -->|2. Consulta/Crea sesión| DB
    Bot -->|3. Responde link único| ClienteWA
    ClienteWA -->|4. Abre web y confirma| ClientView
    ClientView -->|5. Inserta pedido 'PENDIENTE'| DB
    RealtimeEngine -->|6. Evento Push por WebSocket| OperatorView
    OperatorView -->|7. Pesa ítems y marca 'LISTO'| DB
    RealtimeEngine -->|8. Evento Push pedido listo| Bot
    Bot -->|9. Envía WhatsApp con total y alias| ClienteWA
```

---

## 2. Modelo Entidad-Relación (ERD)

```mermaid
erDiagram
    CLIENTES ||--o{ PEDIDOS : "realiza"
    CATEGORIAS ||--o{ PRODUCTOS : "clasifica"
    PRODUCTOS ||--o{ PEDIDO_ITEMS : "incluido_en"
    PEDIDOS ||--|{ PEDIDO_ITEMS : "contiene"

    CLIENTES {
        string id PK "UUID"
        string telefono UK "WhatsApp sin formato, ej: 1123456789"
        string nombre "Nombre o alias del cliente"
        string direccion_habitual "Dirección por defecto"
        timestamp created_at "Fecha de registro"
    }

    CATEGORIAS {
        string id PK "ej: cat-frutas"
        string nombre "Frutas, Verduras, Hojas, Almacen"
        int orden "Orden de visualización en catálogo"
    }

    PRODUCTOS {
        string id PK "ej: prod-tomate"
        string categoria_id FK
        string nombre "ej: Tomate Redondo Premium"
        string unidad_medida "KG o UNIDAD"
        decimal precio "Precio unitario vigente"
        boolean disponible "Switch de stock activo/inactivo"
        decimal paso "Incremento en catálogo (0.25, 0.5, 1.0)"
        string icono "Emoji o URL de imagen"
        timestamp updated_at "Última modificación de precio"
    }

    PEDIDOS {
        int id PK "Correlativo autoincremental visible (#101)"
        string cliente_id FK
        string estado "PENDIENTE, EN_PREPARACION, LISTO, ENTREGADO"
        string tipo_entrega "RETIRO o DELIVERY"
        string direccion_entrega "Dirección confirmada"
        decimal total_estimado "Total calculado en carrito"
        decimal total_real "Total final tras pesaje físico"
        timestamp created_at "Hora de emisión"
        timestamp finalizado_at "Hora de pesaje completado"
    }

    PEDIDO_ITEMS {
        string id PK "UUID"
        int pedido_id FK
        string producto_id FK
        string nombre_historico "Nombre al momento de pedir"
        string unidad_medida "KG o UNIDAD"
        decimal precio_unitario_historico "Precio congelado del momento"
        decimal cantidad_solicitada "Lo que pidió el cliente"
        decimal peso_real "Lo que marcó la balanza"
        decimal subtotal "Cálculo real final"
        boolean sin_stock "Marcado si no había disponibilidad"
    }
```

---

## 3. Especificación de Tablas SQL (PostgreSQL / Supabase)

```sql
-- 1. Tabla de Clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    direccion_habitual TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clientes_telefono ON clientes(telefono);

-- 2. Tabla de Categorías
CREATE TABLE categorias (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    orden INT DEFAULT 0
);

-- 3. Tabla de Productos
CREATE TABLE productos (
    id VARCHAR(50) PRIMARY KEY,
    categoria_id VARCHAR(50) REFERENCES categorias(id),
    nombre VARCHAR(100) NOT NULL,
    unidad_medida VARCHAR(10) NOT NULL CHECK (unidad_medida IN ('KG', 'UNIDAD')),
    precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    disponible BOOLEAN DEFAULT TRUE,
    paso DECIMAL(5,2) DEFAULT 0.5,
    icono VARCHAR(10),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    cliente_id UUID REFERENCES clientes(id) NOT NULL,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO')),
    tipo_entrega VARCHAR(20) DEFAULT 'RETIRO' CHECK (tipo_entrega IN ('RETIRO', 'DELIVERY')),
    direccion_entrega TEXT,
    total_estimado DECIMAL(10,2) NOT NULL,
    total_real DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finalizado_at TIMESTAMPTZ
);

CREATE INDEX idx_pedidos_estado ON pedidos(estado);

-- 5. Tabla de Ítems del Pedido
CREATE TABLE pedido_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id VARCHAR(50) REFERENCES productos(id),
    nombre_historico VARCHAR(100) NOT NULL,
    unidad_medida VARCHAR(10) NOT NULL,
    precio_unitario_historico DECIMAL(10,2) NOT NULL,
    cantidad_solicitada DECIMAL(8,3) NOT NULL,
    peso_real DECIMAL(8,3),
    subtotal DECIMAL(10,2) DEFAULT 0,
    sin_stock BOOLEAN DEFAULT FALSE
);
```

---

## 4. Máquina de Estados del Pedido

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE : Cliente confirma en catálogo web
    PENDIENTE --> EN_PREPARACION : Operario toca "Tomar y Pesar"
    EN_PREPARACION --> LISTO : Operario carga pesos y toca "Finalizar"
    EN_PREPARACION --> PENDIENTE : Operario devuelve pedido a cola
    LISTO --> ENTREGADO : Cliente retira o cadete entrega (Cobro realizado)
    ENTREGADO --> [*]
```

### Transiciones y Efectos Secundarios:
1. **Transición `[*] -> PENDIENTE`:**
   * Se registra el pedido con `total_estimado`.
   * El motor de Realtime emite un evento `INSERT` que hace sonar la campana en el mostrador del operario.
2. **Transición `PENDIENTE -> EN_PREPARACION`:**
   * Se bloquea la tarjeta para ese operario (evita que dos empleados pesen el mismo pedido en paralelo).
3. **Transición `EN_PREPARACION -> LISTO`:**
   * Se validan los campos `peso_real`.
   * Si un ítem fue marcado `sin_stock = true`, se excluye de la sumatoria.
   * Se congela el campo `total_real`.
   * Se emite el evento para disparar el mensaje de WhatsApp al cliente.
4. **Transición `LISTO -> ENTREGADO`:**
   * El pedido sale de la visual operativa activa y pasa al historial de ventas del día.

---

## 5. Estrategia Costo Cero ($0/mes)

Para mantener el proyecto accesible para cualquier estudiante o comercio pequeño, la arquitectura se apoya en capas gratuitas generosas de servicios estándar en la industria:

| Capacidad | Proveedor / Tecnología | Límite Gratuito | Demanda Estimada Verdulería | ¿Costo? |
| :--- | :--- | :--- | :--- | :--- |
| **Hosting Frontend** | Vercel / Cloudflare Pages | Ancho de banda ilimitado / 100 GB | ~2 GB / mes | **\$0** |
| **Base de Datos Postgres** | Supabase Free Tier | 500 MB almacenamiento | ~10 MB para 10.000 pedidos | **\$0** |
| **Conexiones Realtime** | Supabase WebSockets | 200 conexiones simultáneas | 2 a 5 conexiones (local + clientes) | **\$0** |
| **Conector WhatsApp** | `@whiskeysockets/baileys` (Open Source) | Sin límites de mensajes | ~50 a 100 pedidos diarios | **\$0** |

> [!TIP]
> **Sin costos fijos:** Esta arquitectura permite que la verdulería funcione indefinidamente sin ninguna factura mensual de infraestructura.
