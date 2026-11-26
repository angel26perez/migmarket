DROP TABLE IF EXISTS detalle_venta;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS productos;

CREATE TABLE productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    stock INTEGER NOT NULL,
    categoria TEXT NOT NULL,
    etiqueta TEXT DEFAULT '', -- Ej: '2x1', 'Rebaja', 'Más Vendido'
    imagen TEXT
);

CREATE TABLE ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_venta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER,
    producto_id INTEGER,
    cantidad INTEGER,
    subtotal REAL,
    FOREIGN KEY (venta_id) REFERENCES ventas (id),
    FOREIGN KEY (producto_id) REFERENCES productos (id)
);

-