// AutoMax - control de vehículos nuevos
// Todo se guarda en localStorage, bajo la clave de abajo.

var CLAVE = "automax_vehiculos";
var anioActual = new Date().getFullYear();

// Marcas permitidas y su prefijo para el código (FR-001, BM-002...)
// Si hay que agregar otra, se agrega aquí y se actualizan sola las listas.
var MARCAS = [
  { nombre: "Toyota", sigla: "TY" },
  { nombre: "Honda", sigla: "HN" },
  { nombre: "Ford", sigla: "FD" },
  { nombre: "Chevrolet", sigla: "CV" },
  { nombre: "Nissan", sigla: "NS" },
  { nombre: "Hyundai", sigla: "HY" },
  { nombre: "Kia", sigla: "KA" },
  { nombre: "Volkswagen", sigla: "VW" },
  { nombre: "Mercedes-Benz", sigla: "MB" },
  { nombre: "BMW", sigla: "BM" },
  { nombre: "Audi", sigla: "AU" },
  { nombre: "Tesla", sigla: "TS" },
  { nombre: "Porsche", sigla: "PR" },
  { nombre: "Ferrari", sigla: "FR" },
  { nombre: "Lamborghini", sigla: "LB" }
];

var form = document.getElementById("formVehiculo");
var tbody = document.getElementById("listaVehiculos");
var msgVacio = document.getElementById("vacio");
document.getElementById("anio").max = anioActual;
var btnGuardar = document.getElementById("btnGuardar");
var btnCancelar = document.getElementById("btnCancelar");
var tituloForm = document.getElementById("tituloForm");
var campoMarca = document.getElementById("marca");
var campoCodigo = document.getElementById("codigo");

// ids de los campos, en el mismo orden del formulario
var campos = ["marca", "codigo", "modelo", "anio", "color", "combustible", "precio", "cantidad", "descripcion"];

var vehiculos = cargar();
var codigoEditando = null; // si tiene valor, estamos modificando ese vehículo

// localStorage

function cargar() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || [];
  } catch (e) {
    return []; // si el dato está dañado empezamos limpio
  }
}

function guardar() {
  localStorage.setItem(CLAVE, JSON.stringify(vehiculos));
}

// Marcas y códigos

function siglaDe(nombre) {
  var m = MARCAS.find(function (x) { return x.nombre === nombre; });
  return m ? m.sigla : "";
}

// Busca el número más alto que ya existe para esa sigla y le suma 1.
// Se usa el mayor (no la cantidad) para que al borrar uno no se repita un código.
function siguienteCodigo(marca) {
  var sigla = siglaDe(marca);
  if (!sigla) return "";

  var mayor = 0;
  vehiculos.forEach(function (v) {
    var partes = v.codigo.split("-");
    if (partes[0] === sigla) {
      var n = parseInt(partes[1], 10);
      if (n > mayor) mayor = n;
    }
  });

  var texto = String(mayor + 1);
  while (texto.length < 3) texto = "0" + texto; // 1 -> 001
  return sigla + "-" + texto;
}

// Llena los selects de marca (formulario y filtro) y las placas de la portada
function armarMarcas() {
  campoMarca.innerHTML = '<option value="">Selecciona una marca</option>';
  document.getElementById("fMarca").innerHTML = '<option value="">Todas</option>';
  var placas = document.getElementById("listaPlacas");

  MARCAS.forEach(function (m) {
    campoMarca.innerHTML += '<option>' + m.nombre + '</option>';
    document.getElementById("fMarca").innerHTML += '<option>' + m.nombre + '</option>';
    placas.innerHTML += '<li><span class="placa">' + m.sigla + '</span>' + m.nombre + '</li>';
  });
}

// Validaciones

function ponerError(id, texto) {
  var caja = document.getElementById(id).closest(".campo");
  caja.classList.toggle("malo", texto !== "");
  caja.querySelector(".error").textContent = texto;
}

function validar(datos) {
  var ok = true;

  // limpiamos errores anteriores
  campos.forEach(function (id) { ponerError(id, ""); });

  // 1) todos obligatorios
  campos.forEach(function (id) {
    if (datos[id] === "") {
      ponerError(id, id === "codigo" ? "Se genera al elegir la marca." : "Este campo es obligatorio.");
      ok = false;
    }
  });

  // 2) la marca tiene que ser una de la lista
  if (datos.marca !== "" && siglaDe(datos.marca) === "") {
    ponerError("marca", "Elige una marca de la lista.");
    ok = false;
  }

  // 3) código no repetido (por seguridad, aunque se genera solo)
  if (datos.codigo !== "" && codigoEditando === null) {
    var repetido = vehiculos.some(function (v) { return v.codigo === datos.codigo; });
    if (repetido) {
      ponerError("codigo", "Ese código ya está registrado.");
      ok = false;
    }
  }

  // 4) año válido (entero, entre 1900 y el año actual)
  if (datos.anio !== "") {
    var a = Number(datos.anio);
    if (!Number.isInteger(a) || a < 1900 || a > anioActual) {
      ponerError("anio", "Escribe un año entre 1900 y " + anioActual + ".");
      ok = false;
    }
  }

  // 5) precio mayor que cero
  if (datos.precio !== "") {
    var p = Number(datos.precio);
    if (isNaN(p) || p <= 0) {
      ponerError("precio", "El precio debe ser mayor que cero.");
      ok = false;
    }
  }

  // 6) cantidad numérica (entera, 0 o más)
  if (datos.cantidad !== "") {
    var c = Number(datos.cantidad);
    if (isNaN(c) || !Number.isInteger(c) || c < 0) {
      ponerError("cantidad", "La cantidad debe ser un número entero.");
      ok = false;
    }
  }

  return ok;
}

// Filtros

function textoPlano(t) {
  // minúsculas y sin tildes, para que "diesel" encuentre "Diésel"
  return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function filtrar() {
  var buscar = textoPlano(document.getElementById("fBuscar").value.trim());
  var marca = document.getElementById("fMarca").value;
  var comb = document.getElementById("fComb").value;
  var min = document.getElementById("fMin").value;
  var max = document.getElementById("fMax").value;
  var orden = document.getElementById("fOrden").value;

  var lista = vehiculos.filter(function (v) {
    if (marca && v.marca !== marca) return false;
    if (comb && v.combustible !== comb) return false;
    if (min !== "" && v.precio < Number(min)) return false;
    if (max !== "" && v.precio > Number(max)) return false;

    if (buscar) {
      var pajar = textoPlano(v.codigo + " " + v.marca + " " + v.modelo + " " + v.color + " " + v.anio);
      if (pajar.indexOf(buscar) === -1) return false;
    }
    return true;
  });

  if (orden === "precioAsc") lista.sort(function (a, b) { return a.precio - b.precio; });
  if (orden === "precioDesc") lista.sort(function (a, b) { return b.precio - a.precio; });
  if (orden === "anioDesc") lista.sort(function (a, b) { return b.anio - a.anio; });

  return lista;
}

function limpiarFiltros() {
  ["fBuscar", "fMarca", "fComb", "fMin", "fMax"].forEach(function (id) {
    document.getElementById(id).value = "";
  });
  document.getElementById("fOrden").value = "registro";
  pintar();
}

// Pintar la tabla

function dinero(n) {
  return "US$ " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Si el color es un nombre que el navegador entiende (red, blue...) mostramos la pastilla
function pastilla(color) {
  var prueba = new Option().style;
  prueba.color = color;
  if (prueba.color === "") return "";
  return '<span class="chip-color" style="background:' + color + '"></span>';
}

// Evita que un texto con < o > rompa la tabla
function limpio(texto) {
  var d = document.createElement("div");
  d.textContent = texto;
  return d.innerHTML;
}

function pintar() {
  var lista = filtrar();
  tbody.innerHTML = "";

  lista.forEach(function (v) {
    var fila = document.createElement("tr");
    fila.innerHTML =
      '<td><span class="placa">' + limpio(v.codigo) + "</span></td>" +
      "<td>" + limpio(v.marca) + "</td>" +
      "<td>" + limpio(v.modelo) + "<small>" + limpio(v.descripcion) + "</small></td>" +
      "<td>" + v.anio + "</td>" +
      "<td>" + pastilla(v.color) + limpio(v.color) + "</td>" +
      "<td>" + limpio(v.combustible) + "</td>" +
      '<td class="der">' + dinero(v.precio) + "</td>" +
      '<td class="der">' + v.cantidad + "</td>" +
      '<td><div class="fila-btns">' +
        '<button class="btn-editar" data-editar="' + limpio(v.codigo) + '">Editar</button>' +
        '<button class="btn-borrar" data-borrar="' + limpio(v.codigo) + '">Eliminar</button>' +
      "</div></td>";
    tbody.appendChild(fila);
  });

  // mensajes de abajo: patio vacío o filtros sin resultados
  if (vehiculos.length === 0) {
    msgVacio.hidden = false;
    msgVacio.textContent = "El patio está vacío. Registra el primer vehículo en el formulario de arriba.";
  } else if (lista.length === 0) {
    msgVacio.hidden = false;
    msgVacio.textContent = "Ningún vehículo coincide con esos filtros. Prueba ampliando el rango de precio o limpiando la búsqueda.";
  } else {
    msgVacio.hidden = true;
  }

  document.getElementById("conteo").textContent =
    vehiculos.length === 0 ? "" : "Mostrando " + lista.length + " de " + vehiculos.length + " vehículos";

  // contadores de la portada
  var unidades = vehiculos.reduce(function (suma, v) { return suma + Number(v.cantidad); }, 0);

  document.getElementById("totalModelos").textContent = vehiculos.length;
  document.getElementById("totalUnidades").textContent = unidades;
}

// Avisos

var avisoTimer;
function avisar(texto) {
  var el = document.querySelector(".aviso");
  if (!el) {
    el = document.createElement("div");
    el.className = "aviso";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.classList.add("ver");
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(function () { el.classList.remove("ver"); }, 2400);
}

// Modo edición

function salirDeEdicion() {
  codigoEditando = null;
  form.reset();
  form.classList.remove("editando");
  campoMarca.disabled = false;
  btnGuardar.textContent = "Guardar vehículo";
  btnCancelar.hidden = true;
  tituloForm.textContent = "Registrar vehículo";
  campos.forEach(function (id) { ponerError(id, ""); });
}

function entrarEnEdicion(codigo) {
  var v = vehiculos.find(function (x) { return x.codigo === codigo; });
  if (!v) return;

  campos.forEach(function (id) { document.getElementById(id).value = v[id]; });

  codigoEditando = codigo;
  campoMarca.disabled = true; // si cambia la marca cambiaría el código, así que se queda fija
  form.classList.add("editando");
  btnGuardar.textContent = "Guardar cambios";
  btnCancelar.hidden = false;
  tituloForm.textContent = "Modificar vehículo " + codigo;

  document.getElementById("registro").scrollIntoView();
  document.getElementById("modelo").focus();
}

// Eventos

// Al elegir marca se muestra el código que le toca
campoMarca.addEventListener("change", function () {
  campoCodigo.value = siguienteCodigo(campoMarca.value);
});

form.addEventListener("submit", function (e) {
  e.preventDefault();

  // armamos el objeto con lo que escribió el usuario
  var datos = {};
  campos.forEach(function (id) { datos[id] = document.getElementById(id).value.trim(); });

  // se recalcula justo al guardar, por si los datos cambiaron en otra pestaña
  if (codigoEditando === null) {
    datos.codigo = siguienteCodigo(datos.marca);
    campoCodigo.value = datos.codigo;
  }

  if (!validar(datos)) return;

  // los números los guardamos como número, no como texto
  datos.anio = Number(datos.anio);
  datos.precio = Number(datos.precio);
  datos.cantidad = Number(datos.cantidad);

  if (codigoEditando !== null) {
    var pos = vehiculos.findIndex(function (v) { return v.codigo === codigoEditando; });
    vehiculos[pos] = datos;
    avisar("Cambios guardados en " + datos.codigo);
  } else {
    vehiculos.push(datos);
    avisar("Vehículo " + datos.codigo + " registrado");
  }

  guardar();
  pintar();
  salirDeEdicion();
});

btnCancelar.addEventListener("click", salirDeEdicion);

// los filtros se aplican en cuanto se toca cualquiera
["fBuscar", "fMarca", "fComb", "fMin", "fMax", "fOrden"].forEach(function (id) {
  document.getElementById(id).addEventListener("input", pintar);
});
document.getElementById("btnLimpiar").addEventListener("click", limpiarFiltros);

// un solo listener para todos los botones de la tabla
tbody.addEventListener("click", function (e) {
  var btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.editar) {
    entrarEnEdicion(btn.dataset.editar);
  }

  if (btn.dataset.borrar) {
    var cod = btn.dataset.borrar;
    if (!confirm("¿Eliminar el vehículo " + cod + "? Esta acción no se puede deshacer.")) return;

    vehiculos = vehiculos.filter(function (v) { return v.codigo !== cod; });
    guardar();
    pintar();
    if (codigoEditando === cod) salirDeEdicion(); // por si lo estaban editando
    avisar("Vehículo " + cod + " eliminado");
  }
});

armarMarcas();
pintar();