/**
 * Viaje Febrero 2027: entrega los datos del Sheet a la página del viaje.
 *
 * Va ligado al Sheet (Extensiones > Apps Script) y se implementa como
 * aplicación web: Ejecutar como "Yo", acceso "Cualquier usuario".
 * Solo responde con datos si quien pide trae un login de Google válido
 * y su correo está en la pestaña "Accesos".
 */

// El mismo ID de cliente que va en config.js de la página.
var GOOGLE_CLIENT_ID = 'PEGAR_AQUI_EL_ID_DE_CLIENTE';

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
    return responder_({
      ok: true,
      correo: correo,
      calendario: leerPestana_('Calendario'),
      traslados: leerPestana_('Traslados'),
      pendientes: leerPestana_('Pendientes'),
      bitacora: leerPestana_('Bitácora')
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
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Accesos');
  if (!hoja || hoja.getLastRow() < 2) return false;
  var correos = hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getDisplayValues();
  for (var i = 0; i < correos.length; i++) {
    if (String(correos[i][0]).trim().toLowerCase() === correo) return true;
  }
  return false;
}

/** Lee una pestaña como lista de objetos, usando la fila 1 como nombres. */
function leerPestana_(nombre) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
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

function responder_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
