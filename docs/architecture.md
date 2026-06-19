# KORA OS Architecture

## Tecnologías

### Frontend
- Next.js

### Backend
- Next.js API Routes

### Base de Datos
- Supabase PostgreSQL

### Autenticación
- Supabase Auth

### Almacenamiento
- Supabase Storage

---

## Estructura General

Usuario
    │
    ▼
KORA OS
    │
    ▼
Supabase
    │
    ├── Productos
    ├── Inventario
    ├── Clientes
    ├── Ventas
    └── Proveedores

---

## Tablas Iniciales

### productos

| Campo | Tipo |
|---------|---------|
| id | uuid |
| sku | text |
| nombre | text |
| descripcion | text |
| marca_id | uuid |
| categoria_id | uuid |
| precio | numeric |
| stock | integer |
| activo | boolean |

---

### categorias

| Campo | Tipo |
|---------|---------|
| id | uuid |
| nombre | text |

---

### marcas

| Campo | Tipo |
|---------|---------|
| id | uuid |
| nombre | text |

---

### imagenes_producto

| Campo | Tipo |
|---------|---------|
| id | uuid |
| producto_id | uuid |
| url | text |
| orden | integer |

---

### atributos_producto

| Campo | Tipo |
|---------|---------|
| id | uuid |
| producto_id | uuid |
| nombre | text |
| valor | text |

---

## Canales

### WooCommerce

Publicación desde catálogo maestro.

### Mercado Libre

Publicación desde catálogo maestro.

### Falabella

Fase futura.

### Éxito

Fase futura.
