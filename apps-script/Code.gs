/**
 * Viaje Febrero 2027: entrega los datos del Sheet a la página del viaje.
 *
 * Es un proyecto independiente (script.google.com) en una cuenta que tenga
 * el Sheet compartido como lector. Se implementa como aplicación web:
 * Ejecutar como "Yo", acceso "Cualquier usuario".
 * Solo responde con datos si quien pide trae un login de Google válido
 * y su correo está en la pestaña "Accesos".
 */

// El mismo ID de cliente que va en config.js de la página.
var GOOGLE_CLIENT_ID = '496831651340-pv5r04959eofha2iqjrbe9l1q570e7di.apps.googleusercontent.com';

// ID del Sheet con el programa del viaje.
var SHEET_ID = '1OuKuMfCd-jfLPTTMrenmNNzsfpkUWCN51yPGFjAAONs';

// Columnas que no se envían a la página.
var OCULTAS = { Traslados: ['Reserva'] };

function doGet() {
  return responder_({ ok: true, mensaje: 'Servicio del viaje activo.' });
}

function doPost(e) {
  try {
    var pedido = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var correo = verificarLogin_(pedido.credential);
    if (!correo) return responder_({ ok: false, error: 'login_invalido' });
    if (!estaAutorizado_(correo)) {
      return responder_({ ok: false, error: 'no_autorizado', correo: correo });
    }
    if (pedido.accion === 'asignar') {
      return responder_(asignar_(pedido.id, pedido.fecha));
    }
    return responder_({
      ok: true,
      correo: correo,
      calendario: leerPestana_('Calendario'),
      traslados: leerPestana_('Traslados'),
      pendientes: leerPestana_('Pendientes'),
      bitacora: leerPestana_('Bitácora'),
      hojas: leerTodas_()
    });
  } catch (err) {
    return responder_({ ok: false, error: 'error_interno' });
  }
}

/** Valida el token de Google y devuelve el correo, o null si no sirve. */
function verificarLogin_(credential) {
  if (!credential) return null;
  var r = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential),
    { muteHttpExceptions: true }
  );
  if (r.getResponseCode() !== 200) return null;
  var t = JSON.parse(r.getContentText());
  if (t.aud !== GOOGLE_CLIENT_ID) return null;
  if (String(t.email_verified) !== 'true') return null;
  if (t.iss !== 'accounts.google.com' && t.iss !== 'https://accounts.google.com') return null;
  return String(t.email || '').toLowerCase() || null;
}

function estaAutorizado_(correo) {
  var hoja = libro_().getSheetByName('Accesos');
  if (!hoja || hoja.getLastRow() < 2) return false;
  var correos = hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getDisplayValues();
  for (var i = 0; i < correos.length; i++) {
    if (String(correos[i][0]).trim().toLowerCase() === correo) return true;
  }
  return false;
}

/**
 * Asigna un imperdible a un día (dd/mm/aaaa), o lo deja sin día si fecha va vacía.
 * Solo escribe la columna "Día" de la pestaña "Imperdibles".
 */
function asignar_(id, fecha) {
  id = String(id || '').trim();
  fecha = String(fecha || '').trim();
  if (!id) return { ok: false, error: 'sin_id' };
  if (fecha && !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) return { ok: false, error: 'fecha_invalida' };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var hoja = libro_().getSheetByName('Imperdibles');
    if (!hoja) return { ok: false, error: 'sin_hoja' };
    var datos = hoja.getDataRange().getDisplayValues();
    var titulos = datos[0].map(function (t) { return String(t).trim(); });
    var cId = titulos.indexOf('ID');
    var cDia = titulos.indexOf('Día');
    if (cId === -1 || cDia === -1) return { ok: false, error: 'sin_columnas' };
    for (var i = 1; i < datos.length; i++) {
      if (String(datos[i][cId]).trim() === id) {
        var celda = hoja.getRange(i + 1, cDia + 1);
        celda.setNumberFormat('@');
        celda.setValue(fecha);
        return { ok: true, guardado: true, id: id, fecha: fecha };
      }
    }
    return { ok: false, error: 'no_encontrado' };
  } finally {
    lock.releaseLock();
  }
}

// Pestañas que nunca se envían a la página.
var NO_ENVIAR = ['Accesos', 'Léeme', 'Listas'];

/** Lee todas las pestañas de datos, para que las nuevas lleguen sin cambiar el script. */
function leerTodas_() {
  var todas = {};
  libro_().getSheets().forEach(function (hoja) {
    var nombre = hoja.getName();
    if (NO_ENVIAR.indexOf(nombre) === -1) todas[nombre] = leerPestana_(nombre);
  });
  return todas;
}

/** Lee una pestaña como lista de objetos, usando la fila 1 como nombres. */
function leerPestana_(nombre) {
  var hoja = libro_().getSheetByName(nombre);
  if (!hoja || hoja.getLastRow() < 2) return [];
  var valores = hoja.getDataRange().getDisplayValues();
  var titulos = valores[0];
  var ocultas = OCULTAS[nombre] || [];
  var filas = [];
  for (var i = 1; i < valores.length; i++) {
    var fila = {};
    var tieneAlgo = false;
    for (var j = 0; j < titulos.length; j++) {
      var titulo = String(titulos[j]).trim();
      if (!titulo || ocultas.indexOf(titulo) !== -1) continue;
      fila[titulo] = String(valores[i][j]).trim();
      if (fila[titulo]) tieneAlgo = true;
    }
    if (tieneAlgo) filas.push(fila);
  }
  return filas;
}

var libroAbierto_ = null;
function libro_() {
  if (!libroAbierto_) libroAbierto_ = SpreadsheetApp.openById(SHEET_ID);
  return libroAbierto_;
}

/** Ejecuta esta función una vez desde el editor para autorizar los permisos. */
function autorizar() {
  libro_().getName();
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=x', { muteHttpExceptions: true });
  Logger.log('Permisos listos.');
}

function responder_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
