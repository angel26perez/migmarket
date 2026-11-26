let productosCatalogo = [];
let carrito = [];
let categoriaActual = 'Todos';
let usuarioActual = { nombre: '', rol: '' };
let intentosAdmin = 3;
let miGrafico = null;
let ventasDelTurno = []; // Almacena los IDs de las ventas hechas en la sesión actual
let filtroStockBajoActivo = false;

document.addEventListener("DOMContentLoaded", () => {
    const sesionGuardada = localStorage.getItem('minipos_sesion');
    if (sesionGuardada) {
        usuarioActual = JSON.parse(sesionGuardada);
        aplicarPermisosRol();
        document.getElementById('login-backdrop').style.display = 'none';
        mostrarVista('dashboard');
        cargarProductos();
    }
});

function seleccionarRol(nombreRol, tipo) {
    usuarioActual = { nombre: nombreRol, rol: tipo };
    localStorage.setItem('minipos_sesion', JSON.stringify(usuarioActual));
    ventasDelTurno = []; // Reinicia el turno al iniciar sesión
    document.getElementById('login-backdrop').style.display = 'none';
    aplicarPermisosRol();
    mostrarVista('dashboard');
    cargarProductos();
}

function mostrarInputAdmin() {
    document.getElementById('role-selection-box').style.display = 'none';
    document.getElementById('admin-password-box').style.display = 'block';
    document.getElementById('admin-pass-input').value = '';
    document.getElementById('error-msg').style.display = 'none';
}

function volverRoles() {
    document.getElementById('role-selection-box').style.display = 'flex';
    document.getElementById('admin-password-box').style.display = 'none';
}

function verificarPasswordAdmin() {
    const passInput = document.getElementById('admin-pass-input').value;
    const errorMsg = document.getElementById('error-msg');

    if (passInput === 'admin123') {
        seleccionarRol('Administrador', 'admin');
    } else {
        intentosAdmin--;
        if (intentosAdmin <= 0) {
            alert("Has agotado tus 3 oportunidades. Acceso bloqueado.");
            location.reload();
        } else {
            errorMsg.style.display = 'block';
            errorMsg.innerText = `Contraseña incorrecta. Te quedan ${intentosAdmin} intentos.`;
        }
    }
}

function cerrarSesion() {
    localStorage.removeItem('minipos_sesion');
    location.reload();
}

function aplicarPermisosRol() {
    document.getElementById('user-info').innerText = `Rol: ${usuarioActual.nombre}`;
    const btnAdminNuevo = document.getElementById('btn-admin-nuevo');
    const btnFiltroStock = document.getElementById('btn-filtro-stock');

    if (usuarioActual.rol === 'admin') {
        if (btnAdminNuevo) btnAdminNuevo.style.display = 'inline-block';
        if (btnFiltroStock) btnFiltroStock.style.display = 'inline-block';
    } else {
        if (btnAdminNuevo) btnAdminNuevo.style.display = 'none';
        if (btnFiltroStock) btnFiltroStock.style.display = 'none';
    }
}

// --- CONTROL DE VISTAS ---
function mostrarVista(vista) {
    const vDash = document.getElementById('view-dashboard');
    const vPos = document.getElementById('view-pos');

    if (vista === 'dashboard') {
        vDash.style.display = 'block';
        vPos.style.display = 'none';
        cargarDatosDashboard();
    } else if (vista === 'pos') {
        vDash.style.display = 'none';
        vPos.style.display = 'block';
        actualizarContadorStockBajo();
    }
}

function cancelarYVolverAlDashboard() {
    if (carrito.length > 0) {
        if (!confirm("¿Deseas cancelar la venta actual y volver al inicio?")) return;
        carrito = [];
        renderizarCarrito();
    }
    mostrarVista('dashboard');
}

function finalizarYVolver() {
    document.getElementById('modal-factura').style.display = 'none';
    mostrarVista('dashboard');
}

// --- CORTE / ARQUEO DE CAJA ---
async function abrirCorteCaja() {
    if (ventasDelTurno.length === 0) {
        document.getElementById('corte-rol').innerText = usuarioActual.nombre;
        document.getElementById('corte-cantidad').innerText = '0';
        document.getElementById('corte-total').innerText = '$0.0';
        document.getElementById('modal-corte').style.display = 'flex';
        return;
    }

    try {
        const res = await fetch('/api/arqueo-caja', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ventas_ids: ventasDelTurno })
        });
        const data = await res.json();

        document.getElementById('corte-rol').innerText = usuarioActual.nombre;
        document.getElementById('corte-cantidad').innerText = data.cantidad_transacciones;
        document.getElementById('corte-total').innerText = `$${data.total_caja.toLocaleString()}`;
        document.getElementById('modal-corte').style.display = 'flex';
    } catch (e) {
        console.error("Error en arqueo:", e);
    }
}

function cerrarCorteCaja() {
    document.getElementById('modal-corte').style.display = 'none';
}

// --- CONTROL DE STOCK MÍNIMO ---
function actualizarContadorStockBajo() {
    const count = productosCatalogo.filter(p => p.stock < 5).length;
    const badgeCount = document.getElementById('count-stock-bajo');
    if (badgeCount) badgeCount.innerText = count;
}

function alternarFiltroStockBajo() {
    filtroStockBajoActivo = !filtroStockBajoActivo;
    const btn = document.getElementById('btn-filtro-stock');
    const menuCat = document.getElementById('menu-categorias-container');
    const secPop = document.getElementById('seccion-populares');
    const tituloCat = document.getElementById('titulo-categoria-activa');

    if (filtroStockBajoActivo) {
        btn.style.background = '#e74c3c';
        btn.innerText = "⚠️ Mostrando Stock Bajo";
        if (menuCat) menuCat.style.display = 'none';
        if (secPop) secPop.style.display = 'none';
        if (tituloCat) tituloCat.innerText = "⚠️ Alerta: Productos con Stock Menor a 5 Unidades";

        const stockBajos = productosCatalogo.filter(p => p.stock < 5);
        const grid = document.getElementById('grid-categorias');
        grid.innerHTML = '';
        if (stockBajos.length === 0) {
            grid.innerHTML = `<p style="color: #888; grid-column: span 3; padding: 1rem;">¡Excelente! No hay productos con stock crítico.</p>`;
        } else {
            stockBajos.forEach(prod => grid.appendChild(crearTarjeta(prod)));
        }
    } else {
        btn.style.background = '#c0392b';
        btn.innerText = `⚠️ Ver Stock Bajo (${productosCatalogo.filter(p => p.stock < 5).length})`;
        if (menuCat) menuCat.style.display = 'block';
        if (secPop) secPop.style.display = 'block';
        filtrarPorCategoria(categoriaActual);
    }
}

// --- DASHBOARD ANALÍTICO ---
async function cargarDatosDashboard() {
    try {
        const res = await fetch('/api/estadisticas-avanzadas');
        const data = await res.json();

        document.getElementById('dash-total').innerText = `$${data.total_historico.toLocaleString()}`;
        document.getElementById('dash-transacciones').innerText = data.total_transacciones;
        document.getElementById('dash-top').innerText = data.top_producto;

        const tablaContainer = document.getElementById('tabla-ultimas-ventas');
        tablaContainer.innerHTML = '';

        if (data.ultimas_ventas.length === 0) {
            tablaContainer.innerHTML = '<p style="color: #888;">No hay ventas registradas todavía.</p>';
        } else {
            data.ultimas_ventas.forEach(v => {
                const cardVenta = document.createElement('div');
                cardVenta.style.cssText = "background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.8rem; margin-bottom: 0.6rem; font-size: 0.9rem;";
                
                let itemsHtml = v.items.map(i => `<span style="background: #e2e8f0; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.8rem; margin-right: 4px;">${i.imagen} ${i.nombre} (x${i.cantidad})</span>`).join('');

                cardVenta.innerHTML = `
                    <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 0.3rem;">
                        <span>Venta #${v.id}</span>
                        <span style="color: #27ae60;">$${v.total.toLocaleString()}</span>
                    </div>
                    <div style="margin-bottom: 0.3rem; color: #555;">${itemsHtml}</div>
                    <div style="font-size: 0.75rem; color: #888;">Fecha: ${v.fecha}</div>
                `;
                tablaContainer.appendChild(cardVenta);
            });
        }

        const ctx = document.getElementById('graficoVentas').getContext('2d');
        const labels = data.ventas_diarias.map(v => v.dia);
        const valores = data.ventas_diarias.map(v => v.total_dia);

        if (miGrafico) miGrafico.destroy();

        miGrafico = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['Sin ventas'],
                datasets: [{
                    label: 'Ventas por Día ($)',
                    data: valores.length > 0 ? valores : [0],
                    backgroundColor: 'rgba(39, 174, 96, 0.6)',
                    borderColor: 'rgba(39, 174, 96, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });

    } catch (e) {
        console.error("Error cargando dashboard:", e);
    }
}

async function cargarProductos() {
    try {
        const response = await fetch('/api/productos');
        productosCatalogo = await response.json();
        actualizarContadorStockBajo();
        filtrarPorCategoria(categoriaActual);
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

function filtrarPorCategoria(categoria) {
    if (filtroStockBajoActivo) return; // Si el filtro de stock bajo está activo, no interfiere
    categoriaActual = categoria;
    const titulo = document.getElementById('titulo-categoria-activa');
    if (titulo) titulo.innerText = `📂 Productos de la Categoría: ${categoria}`;

    const baseProductos = (categoria === 'Todos')
        ? productosCatalogo 
        : productosCatalogo.filter(p => p.categoria.toLowerCase() === categoria.toLowerCase());

    renderizarPopulares(baseProductos);

    const grid = document.getElementById('grid-categorias');
    if (grid) {
        grid.innerHTML = '';
        if (baseProductos.length === 0) {
            grid.innerHTML = `<p style="color: #888; grid-column: span 3; padding: 1rem;">No hay productos en esta categoría.</p>`;
        } else {
            baseProductos.forEach(prod => grid.appendChild(crearTarjeta(prod)));
        }
    }
}

function renderizarPopulares(lista) {
    const grid = document.getElementById('grid-populares');
    if (!grid) return;
    const populares = lista.slice(0, 6);
    grid.innerHTML = '';
    populares.forEach(prod => grid.appendChild(crearTarjeta(prod)));
}

function filtrarProductos() {
    const texto = document.getElementById('search-input').value.toLowerCase().trim();
    const gridCategorias = document.getElementById('grid-categorias');
    const tituloCategoria = document.getElementById('titulo-categoria-activa');

    if (!texto) {
        filtrarPorCategoria(categoriaActual);
        return;
    }

    const filtrados = productosCatalogo.filter(prod => 
        prod.nombre.toLowerCase().includes(texto) || prod.id.toString() === texto || prod.id.toString().includes(texto)
    );

    renderizarPopulares(filtrados);

    if (gridCategorias) {
        gridCategorias.innerHTML = '';
        if (filtrados.length === 0) {
            gridCategorias.innerHTML = `<p style="color: #888; grid-column: span 3; padding: 1rem;">No se encontraron resultados para "${texto}".</p>`;
        } else {
            filtrados.forEach(prod => gridCategorias.appendChild(crearTarjeta(prod)));
        }
    }
    if (tituloCategoria) tituloCategoria.innerText = `🔍 Resultados de búsqueda para: "${texto}"`;
}

function crearTarjeta(prod) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Etiqueta visual de stock bajo parpadeante si hay menos de 5 unidades
    let badgeStock = '';
    if (prod.stock < 5) {
        badgeStock = `<span class="badge-stock-bajo">⚠️ Stock Bajo</span>`;
    }

    let adminButtons = '';
    if (usuarioActual.rol === 'admin') {
        adminButtons = `
            <div style="display: flex; gap: 0.3rem; width: 100%; margin-top: 0.3rem;">
                <button style="flex:1; background:#f39c12; color:white; border:none; padding:0.2rem; border-radius:3px; cursor:pointer; font-size:0.75rem;" onclick="abrirModalEditar(${prod.id})">✏️ Editar</button>
                <button style="flex:1; background:#c0392b; color:white; border:none; padding:0.2rem; border-radius:3px; cursor:pointer; font-size:0.75rem;" onclick="eliminarProducto(${prod.id})">🗑️ Borrar</button>
            </div>
        `;
    }

    card.innerHTML = `
        <span class="product-id">ID: #${prod.id}</span>
        ${badgeStock}
        <div class="product-icon">${prod.imagen || '📦'}</div>
        <h3>${prod.nombre}</h3>
        <p>$${prod.precio.toLocaleString()} | Stock: ${prod.stock}</p>
        <button class="btn-add" onclick="agregarAlCarrito(${prod.id})">Agregar</button>
        ${adminButtons}
    `;
    return card;
}

// --- MODALES ADMIN ---
function abrirModalEditar(id) {
    const prod = productosCatalogo.find(p => p.id === id);
    if (!prod) return;
    document.getElementById('edit-prod-id').value = prod.id;
    document.getElementById('edit-prod-nombre').innerText = prod.nombre;
    document.getElementById('edit-prod-precio').value = prod.precio;
    document.getElementById('edit-prod-stock').value = prod.stock;
    document.getElementById('modal-editar').style.display = 'flex';
}

function cerrarModalEditar() { document.getElementById('modal-editar').style.display = 'none'; }

async function guardarEdicionProducto() {
    const id = document.getElementById('edit-prod-id').value;
    const precio = parseFloat(document.getElementById('edit-prod-precio').value);
    const stock = parseInt(document.getElementById('edit-prod-stock').value);

    try {
        const res = await fetch('/api/productos/editar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, precio, stock })
        });
        const data = await res.json();
        if (data.success) {
            cerrarModalEditar();
            cargarProductos();
        }
    } catch (e) { console.error(e); }
}

function abrirModalNuevoProducto() { document.getElementById('modal-nuevo').style.display = 'flex'; }
function cerrarModalNuevoProducto() { document.getElementById('modal-nuevo').style.display = 'none'; }

async function crearNuevoProducto() {
    const nombre = document.getElementById('nuevo-nombre').value;
    const precio = parseFloat(document.getElementById('nuevo-precio').value);
    const stock = parseInt(document.getElementById('nuevo-stock').value);
    const categoria = document.getElementById('nuevo-categoria').value;
    const imagen = document.getElementById('nuevo-imagen').value;

    if (!nombre || !precio || isNaN(stock)) { alert("Completa los campos."); return; }

    try {
        const res = await fetch('/api/productos/agregar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, precio, stock, categoria, imagen })
        });
        const data = await res.json();
        if (data.success) {
            cerrarModalNuevoProducto();
            cargarProductos();
        }
    } catch (e) { console.error(e); }
}

async function eliminarProducto(id) {
    if (!confirm(`¿Eliminar producto ID #${id}?`)) return;
    try {
        await fetch(`/api/productos/eliminar/${id}`, { method: 'DELETE' });
        cargarProductos();
    } catch (e) { console.error(e); }
}

// --- CARRITO Y VENTAS ---
function agregarAlCarrito(id) {
    const producto = productosCatalogo.find(p => p.id === id);
    const itemEnCarrito = carrito.find(item => item.id === id);

    if (itemEnCarrito) {
        if (itemEnCarrito.cantidad < producto.stock) itemEnCarrito.cantidad++;
        else { alert("Stock agotado."); return; }
    } else {
        if (producto.stock > 0) carrito.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 });
        else { alert("Agotado."); return; }
    }
    renderizarCarrito();
}

function restarDelCarrito(id) {
    const item = carrito.find(p => p.id === id);
    if (item) {
        item.cantidad--;
        if (item.cantidad <= 0) carrito = carrito.filter(p => p.id !== id);
    }
    renderizarCarrito();
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(p => p.id !== id);
    renderizarCarrito();
}

function cancelarPedidoTotal() {
    if (carrito.length === 0) return;
    if (confirm("¿Vaciar carrito?")) { carrito = []; renderizarCarrito(); }
}

function renderizarCarrito() {
    const container = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total');
    
    if (carrito.length === 0) {
        container.innerHTML = `<p style="color: #999; text-align: center; margin-top: 2rem;">El carrito está vacío</p>`;
        totalElement.innerText = `$0.0`;
        return;
    }

    container.innerHTML = '';
    let total = 0;

    carrito.forEach(item => {
        let subtotal = item.precio * item.cantidad;
        total += subtotal;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div>
                <strong>${item.nombre}</strong><br>
                <div class="qty-controls">
                    <button class="btn-qty" onclick="restarDelCarrito(${item.id})">-</button>
                    <span>${item.cantidad}</span>
                    <button class="btn-qty" onclick="agregarAlCarrito(${item.id})">+</button>
                    <small style="margin-left:5px;">x $${item.precio.toLocaleString()}</small>
                </div>
            </div>
            <div>
                <span>$${subtotal.toLocaleString()}</span>
                <button style="border:none; background:none; cursor:pointer; margin-left:5px;" onclick="eliminarDelCarrito(${item.id})">❌</button>
            </div>
        `;
        container.appendChild(div);
    });

    totalElement.innerText = `$${total.toLocaleString()}`;
}

async function procesarPago() {
    if (carrito.length === 0) { alert("Agrega productos antes de cobrar."); return; }

    const payload = { carrito: carrito.map(item => ({ id: item.id, cantidad: item.cantidad })) };

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resultado = await response.json();

        if (response.ok) {
            ventasDelTurno.push(resultado.venta_id); // Registra la venta para el arqueo del cajero
            mostrarFactura(resultado.venta_id, resultado.total, carrito);
            carrito = [];
            renderizarCarrito();
            cargarProductos();
        } else {
            alert(`Error: ${resultado.error}`);
        }
    } catch (error) { console.error(error); }
}

function mostrarFactura(ventaId, total, itemsComprados) {
    document.getElementById('factura-id').innerText = `#${ventaId}`;
    document.getElementById('factura-fecha').innerText = new Date().toLocaleString();
    document.getElementById('factura-rol').innerText = `${usuarioActual.nombre}`;
    
    const detallesContainer = document.getElementById('factura-detalles');
    detallesContainer.innerHTML = '';

    itemsComprados.forEach(item => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.fontSize = '0.9rem';
        row.style.margin = '0.3rem 0';
        row.innerHTML = `<span>${item.nombre} (x${item.cantidad})</span> <span>$${(item.precio * item.cantidad).toLocaleString()}</span>`;
        detallesContainer.appendChild(row);
    });

    document.getElementById('factura-total').innerText = `$${total.toLocaleString()}`;
    document.getElementById('modal-factura').style.display = 'flex';
}

function cerrarFactura() { document.getElementById('modal-factura').style.display = 'none'; }