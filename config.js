// Configuración de la página del viaje.
// Ninguno de estos dos valores es secreto: los datos solo se entregan
// a los correos de la pestaña "Accesos" del Sheet, después del login.
window.VIAJE_CONFIG = {
  // URL de la implementación del Apps Script (termina en /exec).
  APPS_SCRIPT_URL: "",
  // ID de cliente OAuth de Google (termina en .apps.googleusercontent.com).
  GOOGLE_CLIENT_ID: "496831651340-pv5r04959eofha2iqjrbe9l1q570e7di.apps.googleusercontent.com",
  // Ciudad de casa: los días que parten o terminan aquí se muestran como vuelo.
  CASA: "Santiago"
};
