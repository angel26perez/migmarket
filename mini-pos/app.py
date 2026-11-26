import os
import sqlite3
from flask import Flask, g, jsonify, render_template, request

app = Flask(__name__)
DATABASE = "database.db"


def get_db():
  db = getattr(g, "_database", None)
  if db is None:
    db = g._database = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
  return db


@app.teardown_appcontext
def close_connection(exception):
  db = getattr(g, "_database", None)
  if db is not None:
    db.close()


def init_db():
  with app.app_context():
    db = get_db()
    db.executescript("""
            DROP TABLE IF EXISTS detalle_venta;
            DROP TABLE IF EXISTS ventas;
            DROP TABLE IF EXISTS productos;

            CREATE TABLE productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                precio REAL NOT NULL,
                stock INTEGER NOT NULL,
                categoria TEXT NOT NULL,
                etiqueta TEXT DEFAULT '',
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
        """)

    # CATÁLOGO AMPLIADO CON EXACTAMENTE 10 CATEGORÍAS
    catalogo_real = {
        "Bebidas": [
            ("Café Americano", "☕", 4500),
            ("Jugo Natural de Naranja", "🧃", 6000),
            ("Té Verde Helado", "🍵", 4000),
            ("Agua Mineral con Gas", "💧", 2500),
            ("Smoothie de Fresa", "🍓", 8000),
            ("Cerveza Artesanal", "🍺", 12000),
            ("Refresco de Cola", "🥤", 5000),
        ],
        "Comidas": [
            ("Sandwich de Pollo", "🥪", 12000),
            ("Pizza Margarita Familiar", "🍕", 28000),
            ("Hamburguesa Doble Carne", "🍔", 18000),
            ("Ensalada César con Pollo", "🥗", 15000),
            ("Tacos Mexicanos (3 Und)", "🌮", 16000),
            ("Perro Caliente Especial", "🌭", 10000),
        ],
        "Arte y Diseño": [
            ("Cuadro Lienzo Pintura", "🖼️", 45000),
            ("Set de Acuarelas Pro", "🎨", 22000),
            ("Lienzo en Blanco 30x40", "🖼️", 12000),
            ("Pinceles de Cerda Fina", "🖌️", 9000),
            ("Bloc de Dibujo Artístico", "📒", 15000),
        ],
        "Moda y Ropa": [
            ("Camiseta Básica de Algodón", "👚", 25000),
            ("Pantalón Jeans Casual", "👖", 60000),
            ("Sudadera Deportiva Cómoda", "🧥", 45000),
            ("Gorra Estilo Urbano", "🧢", 18000),
            ("Medias Estampadas x3", "🧦", 10000),
        ],
        "Deportes": [
            ("Balón de Fútbol Profesional", "⚽", 75000),
            ("Pelota de Baloncesto", "🏀", 70000),
            ("Botella Termo Deportiva", "🍼", 25000),
            ("Corda para Saltar Ajustable", "🪢", 15000),
            ("Guantes de Gimnasio", "🥊", 20000),
        ],
        "Cuidado Personal": [
            ("Cepillo Dental de Bambú", "🦷", 6000),
            ("Crema Dental Blanqueadora", "🦷", 8500),
            ("Reloj de Pared Minimalista", "🕑", 35000),
            ("Máscara de Teatro Decorativa", "🎭", 28000),
            ("Kit de Costura Portátil", "🪡", 12000),
        ],
        "Snacks y Frutas": [
            ("Galletas de Chocolate", "🍪", 2500),
            ("Manzana Roja Fresca", "🍎", 2000),
            ("Banano Maduro (Kilo)", "🍌", 3500),
            ("Barra de Cacao Oscuro", "🍫", 4000),
            ("Crispetas de Maíz Mantequilla", "🍿", 5000),
        ],
        "Panadería": [
            ("Pan de Bono Tradicional", "🍞", 3000),
            ("Croissant de Mantequilla", "🥐", 3500),
            ("Pan Baguette Rústico", "🥖", 4000),
            ("Pretzel Suizo", "🥨", 4500),
            ("Almojábana Costeña", "🧀", 3500),
        ],
        "Aseo Hogar": [
            ("Jabón de Baño Antibacterial", "🧼", 3500),
            ("Esponja de Cocina", "🧽", 2000),
            ("Papel Higiénico (Pack x4)", "🧻", 9000),
            ("Escoba Cerdas Suaves", "🧹", 14000),
            ("Detergente en Polvo", "🧺", 11000),
        ],
        "Lácteos": [
            ("Queso Doble Crema", "🧀", 12000),
            ("Leche Entera (Litro)", "🥛", 4500),
            ("Mantequilla con Sal", "🧈", 5000),
            ("Yogur Griego Natural", "🍼", 6500),
            ("Arequipe Tradicional", "🍯", 7000),
        ],
    }

    cursor = db.cursor()

    for categoria, lista_items in catalogo_real.items():
      for ronda in range(1, 6):
        for idx, (nombre_base, emoji, precio_base) in enumerate(lista_items):
          sufijo = (
              "Clásico"
              if ronda == 1
              else (
                  "Familiar"
                  if ronda == 2
                  else (
                      "Especial"
                      if ronda == 3
                      else "Artesanal" if ronda == 4 else "Premium"
                  )
              )
          )
          nombre_final = f"{nombre_base} {sufijo}"
          precio_final = float(precio_base + (ronda * 400) - 200)
          stock_final = (idx * 3 + ronda) % 25 + 5

          cursor.execute(
              "INSERT INTO productos (nombre, precio, stock, categoria,"
              " etiqueta, imagen) VALUES (?, ?, ?, ?, ?, ?)",
              (
                  nombre_final,
                  precio_final,
                  stock_final,
                  categoria,
                  "",
                  emoji,
              ),
          )

    db.commit()


@app.route("/")
def index():
  return render_template("index.html")


@app.route("/api/productos", methods=["GET"])
def get_productos():
  db = get_db()
  cursor = db.execute("SELECT * FROM productos")
  productos = [dict(row) for row in cursor.fetchall()]
  return jsonify(productos)


@app.route("/api/ventas", methods=["GET"])
def get_ventas():
  db = get_db()
  cursor = db.execute("SELECT * FROM ventas ORDER BY fecha DESC")
  ventas = [dict(row) for row in cursor.fetchall()]
  return jsonify(ventas)


@app.route("/api/productos/editar", methods=["POST"])
def editar_producto():
  data = request.get_json()
  db = get_db()
  cursor = db.cursor()
  try:
    cursor.execute(
        "UPDATE productos SET precio = ?, stock = ? WHERE id = ?",
        (data.get("precio"), data.get("stock"), data.get("id")),
    )
    db.commit()
    return jsonify({"success": True})
  except Exception as e:
    return jsonify({"error": str(e)}), 500


@app.route("/api/productos/agregar", methods=["POST"])
def agregar_producto():
  data = request.get_json()
  try:
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO productos (nombre, precio, stock, categoria, etiqueta,"
        " imagen) VALUES (?, ?, ?, ?, ?, ?)",
        (
            data["nombre"],
            data["precio"],
            data["stock"],
            data["categoria"],
            "",
            data["imagen"],
        ),
    )
    db.commit()
    return jsonify({"success": True})
  except Exception as e:
    return jsonify({"error": str(e)}), 500


@app.route("/api/productos/eliminar/<int:prod_id>", methods=["DELETE"])
def eliminar_producto(prod_id):
  db = get_db()
  cursor = db.cursor()
  try:
    cursor.execute("DELETE FROM productos WHERE id = ?", (prod_id,))
    db.commit()
    return jsonify({"success": True})
  except Exception as e:
    return jsonify({"error": str(e)}), 500

# --- ENDPOINT DE ESTADÍSTICAS PARA EL DASHBOARD ---
@app.route("/api/estadisticas", methods=["GET"])
def get_estadisticas():
  db = get_db()

  # 1. Total histórico recaudado
  res_total = db.execute(
      "SELECT SUM(total) as total_historico FROM ventas"
  ).fetchone()
  total_historico = (
      res_total["total_historico"] if res_total["total_historico"] else 0
  )

  # 2. Producto más vendido
  res_top = db.execute("""
        SELECT p.nombre, SUM(dt.cantidad) as total_vendidos 
        FROM detalle_venta dt 
        JOIN productos p ON dt.producto_id = p.id 
        GROUP BY dt.producto_id 
        ORDER BY total_vendidos DESC LIMIT 1
    """).fetchone()
  top_producto = res_top["nombre"] if res_top else "Aún sin ventas"

  # 3. Ventas agrupadas por fecha para la gráfica
  cursor_ventas = db.execute("""
        SELECT DATE(fecha) as dia, SUM(total) as total_dia 
        FROM ventas 
        GROUP BY DATE(fecha) 
        ORDER BY dia ASC
    """)
  ventas_diarias = [dict(row) for row in cursor_ventas.fetchall()]

  return jsonify({
      "total_historico": total_historico,
      "top_producto": top_producto,
      "ventas_diarias": ventas_diarias,
  })

# --- ENDPOINT DE ESTADÍSTICAS Y ÚLTIMAS VENTAS DETALLADAS ---
@app.route("/api/estadisticas-avanzadas", methods=["GET"])
def get_estadisticas_avanzadas():
  db = get_db()

  # 1. Total histórico y cantidad de transacciones
  res_total = db.execute(
      "SELECT SUM(total) as total, COUNT(id) as count FROM ventas"
  ).fetchone()
  total_historico = res_total["total"] if res_total["total"] else 0
  total_transacciones = res_total["count"] if res_total["count"] else 0

  # 2. Producto más vendido
  res_top = db.execute("""
        SELECT p.nombre, SUM(dt.cantidad) as total_vendidos 
        FROM detalle_venta dt 
        JOIN productos p ON dt.producto_id = p.id 
        GROUP BY dt.producto_id 
        ORDER BY total_vendidos DESC LIMIT 1
    """).fetchone()
  top_producto = res_top["nombre"] if res_top else "Aún sin ventas"

  # 3. Ventas por día para la gráfica
  cursor_ventas = db.execute("""
        SELECT DATE(fecha) as dia, SUM(total) as total_dia 
        FROM ventas GROUP BY DATE(fecha) ORDER BY dia ASC
    """)
  ventas_diarias = [dict(row) for row in cursor_ventas.fetchall()]

  # 4. Últimas 10 ventas con su detalle de productos comprados
  cursor_ultimas = db.execute("SELECT * FROM ventas ORDER BY fecha DESC LIMIT 10")
  ultimas_ventas = []
  for v in cursor_ultimas.fetchall():
    v_dict = dict(v)
    detalles_cursor = db.execute(
        """
            SELECT dt.cantidad, dt.subtotal, p.nombre, p.imagen 
            FROM detalle_venta dt 
            JOIN productos p ON dt.producto_id = p.id 
            WHERE dt.venta_id = ?
        """,
        (v["id"],),
    )
    v_dict["items"] = [dict(d) for d in detalles_cursor.fetchall()]
    ultimas_ventas.append(v_dict)

  return jsonify({
      "total_historico": total_historico,
      "total_transacciones": total_transacciones,
      "top_producto": top_producto,
      "ventas_diarias": ventas_diarias,
      "ultimas_ventas": ultimas_ventas,
  })


# --- ENDPOINT PARA EL CORTE / ARQUEO DE CAJA ---
@app.route("/api/arqueo-caja", methods=["POST"])
def arqueo_caja():
  data = request.get_json()
  ventas_ids = data.get("ventas_ids", [])
  if not ventas_ids:
    return jsonify({
        "total_caja": 0,
        "cantidad_transacciones": 0,
        "mensaje": "No hay ventas registradas en este turno.",
    })

  db = get_db()
  placeholders = ",".join(["?"] * len(ventas_ids))
  query = f"SELECT SUM(total) as total, COUNT(id) as count FROM ventas WHERE id IN ({placeholders})"
  res = db.execute(query, ventas_ids).fetchone()

  return jsonify({
      "total_caja": res["total"] if res["total"] else 0,
      "cantidad_transacciones": res["count"] if res["count"] else 0,
  })

@app.route("/api/checkout", methods=["POST"])
def checkout():
  data = request.get_json()
  carrito = data.get("carrito", [])
  if not carrito:
    return jsonify({"error": "El carrito está vacío"}), 400

  db = get_db()
  cursor = db.cursor()

  try:
    total_venta = 0
    for item in carrito:
      prod_id = item["id"]
      cant = item["cantidad"]
      cursor.execute("SELECT precio, stock FROM productos WHERE id = ?", (prod_id,))
      prod = cursor.fetchone()
      if not prod or prod["stock"] < cant:
        return jsonify({"error": f"Stock insuficiente para ID {prod_id}"}), 400
      total_venta += prod["precio"] * cant

    cursor.execute("INSERT INTO ventas (total) VALUES (?)", (total_venta,))
    venta_id = cursor.lastrowid

    for item in carrito:
      prod_id = item["id"]
      cant = item["cantidad"]
      cursor.execute("SELECT precio FROM productos WHERE id = ?", (prod_id,))
      precio = cursor.fetchone()["precio"]
      subtotal = precio * cant
      cursor.execute(
          "INSERT INTO detalle_venta (venta_id, producto_id, cantidad,"
          " subtotal) VALUES (?, ?, ?, ?)",
          (venta_id, prod_id, cant, subtotal),
      )
      cursor.execute(
          "UPDATE productos SET stock = stock - ? WHERE id = ?", (cant, prod_id)
      )

    db.commit()
    return jsonify({"success": True, "venta_id": venta_id, "total": total_venta})
  except Exception as e:
    db.rollback()
    return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
  if not os.path.exists(DATABASE):
    init_db()
  app.run(debug=True, port=5000)


