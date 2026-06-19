# KORA OS Database Design

## Objetivo

Crear un catálogo maestro que permita administrar productos una sola vez y publicarlos posteriormente en:

* WooCommerce
* Mercado Libre
* Falabella
* Éxito
* Otros marketplaces futuros

La base de datos debe soportar múltiples marcas del Grupo Kubbonet y categorías completamente distintas como joyería, velas, detailing y futuras líneas de negocio.

---

# Principios de Diseño

1. Un producto existe una sola vez.
2. Cada marketplace consume el mismo producto.
3. Los atributos son dinámicos.
4. La información logística es independiente.
5. Las publicaciones son independientes del producto.
6. La arquitectura debe soportar crecimiento futuro hacia CRM, inventario, compras y analítica.

---

# Tabla: brands

Representa las marcas administradas por KORA.

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| name       | text      |
| slug       | text      |
| active     | boolean   |
| created_at | timestamp |

## Ejemplos

* Meridian
* Overspray
* Greenwich
* Amuletto
* Enso

---

# Tabla: categories

Categorías de productos.

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| name       | text      |
| slug       | text      |
| parent_id  | uuid      |
| active     | boolean   |
| created_at | timestamp |

## Ejemplos

* Pulseras
* Collares
* Tobilleras
* Japa Mala
* Velas
* Detailing

---

# Tabla: products

Información principal del producto.

| Campo             | Tipo      |
| ----------------- | --------- |
| id                | uuid      |
| sku               | text      |
| name              | text      |
| slug              | text      |
| short_description | text      |
| description       | text      |
| brand_id          | uuid      |
| category_id       | uuid      |
| cost              | numeric   |
| price             | numeric   |
| stock             | integer   |
| active            | boolean   |
| created_at        | timestamp |
| updated_at        | timestamp |

---

# Tabla: product_dimensions

Información logística.

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| product_id | uuid      |
| weight     | numeric   |
| length     | numeric   |
| width      | numeric   |
| height     | numeric   |
| created_at | timestamp |

## Uso

Requerido por:

* Falabella
* Mercado Libre
* WooCommerce
* Operadores logísticos

---

# Tabla: product_images

Imágenes del producto.

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| product_id | uuid      |
| image_url  | text      |
| sort_order | integer   |
| created_at | timestamp |

---

# Tabla: attribute_definitions

Catálogo de atributos disponibles.

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| name       | text      |
| data_type  | text      |
| active     | boolean   |
| created_at | timestamp |

## Ejemplos

* Piedra
* Diámetro
* Género
* Material
* Tipo Automotriz
* Volumen
* Garantía

---

# Tabla: product_attributes

Valores de atributos de cada producto.

| Campo        | Tipo      |
| ------------ | --------- |
| id           | uuid      |
| product_id   | uuid      |
| attribute_id | uuid      |
| value        | text      |
| created_at   | timestamp |

## Ejemplos Meridian

Piedra = Turmalina Negra

Diámetro = 8 mm

Género = Unisex

Material = Piedra Natural

## Ejemplos Overspray

Tipo Automotriz = Automóvil

Volumen = 500 ml

Tipo Producto = Shampoo

---

# Tabla: marketplaces

Canales de venta.

| Campo  | Tipo    |
| ------ | ------- |
| id     | uuid    |
| name   | text    |
| slug   | text    |
| active | boolean |

## Ejemplos

* WooCommerce
* Mercado Libre
* Falabella
* Éxito

---

# Tabla: marketplace_listings

Publicaciones por canal.

Un producto puede tener múltiples publicaciones.

| Campo                | Tipo      |
| -------------------- | --------- |
| id                   | uuid      |
| product_id           | uuid      |
| marketplace_id       | uuid      |
| external_id          | text      |
| marketplace_category | text      |
| title                | text      |
| listing_url          | text      |
| status               | text      |
| sync_date            | timestamp |
| created_at           | timestamp |

## Ejemplo

Producto:

MER-PUL-TUR-8

Canales:

* Mercado Libre
* WooCommerce
* Falabella

Cada uno genera una publicación independiente.

---

# Fase 1

Tablas a implementar inicialmente:

* brands
* categories
* products
* product_dimensions
* product_images
* attribute_definitions
* product_attributes

---

# Fase 2

Integración WooCommerce.

Agregar:

* marketplaces
* marketplace_listings

---

# Fase 3

Integración Mercado Libre.

---

# Fase 4

Ventas.

Tablas futuras:

* orders
* order_items

---

# Fase 5

CRM.

Tablas futuras:

* customers
* customer_addresses
* customer_interactions

---

# Fase 6

Compras e Inventario.

Tablas futuras:

* suppliers
* purchases
* inventory_movements

---

# Fase 7

Analítica.

Tablas futuras:

* metrics
* dashboards

---

# Visión Final

KORA OS será la fuente única de verdad para:

* Catálogo Maestro
* Inventario
* Publicaciones
* Marketplace Hub
* CRM
* Compras
* Analítica
* Inteligencia Artificial
