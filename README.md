# Transporte Escolar – Sitio Web (V2.1)

Plataforma en HTML/JS (sin servidor) para **importar nómina desde Excel**, **buscar por RUT**, **asignar bus/recorrido con control de cupos**, enviar rezagados a **En_espera**, y **exportar reportes Excel**.

Incluye opción **Multi‑PC sincronizada** (Google Sheets + Apps Script) para que 3 digitadores trabajen sobre un mismo “origen de verdad”.

## Credenciales (digitadores)

- belenacuna@liceosannicolas.cl / **Buses2026**
- franciscopinto@liceosannicolas.cl / **Buses2026**
- echeverri@liceosannicolas.cl / **Buses2026**

## 1) Uso en modo Local (rápido)

1. Abre `tools/importer.html` y carga el Excel.
2. Guarda base.
3. Ingresa con `app/login.html`.
4. Asigna por RUT en `app/dashboard.html`.
5. Exporta en `📤 Exportar Excel (todo)`.

### Importante: abrir con servidor local (evita errores de Excel)

Si abres con doble clic (file://) puede fallar la carga de XLSX (por CDN o políticas del navegador).
Recomendado:

```bash
python -m http.server 8000
```

Luego abre: `http://localhost:8000`

## 2) Modo Multi‑PC (Sync) – Google Sheets / Apps Script

### 2.1 Crear la planilla

Crea una planilla Google Sheets con estas hojas (exactas):

- `Students`
- `Buses`
- `Zonas`
- `Assignments`
- `Waitlist`

### 2.2 Apps Script

1. Abre **Extensiones → Apps Script**.
2. Copia el contenido de `backend/AppsScript.gs` en el editor.
3. En **Project Settings** agrega una propiedad:
   - `API_KEY` = una clave fuerte (ej: 30+ caracteres)
4. Implementa como **Web App**:
   - Execute as: **Me**
   - Who has access: **Anyone** (o tu dominio si aplica)

Copia la URL final del Web App.

### 2.3 Configurar el sitio

Edita `config/config.js` (o desde el Panel → Configuración):

```js
window.TS_CONFIG = {
  SYNC: {
    enabled: true,
    appsScriptUrl: "TU_URL_WEBAPP",
    apiKey: "TU_API_KEY"
  }
};
```

Luego en el Panel, elige **☁️ Modo Sync** y presiona **📡 Probar conexión**.

### 2.4 Importar estudiantes a la nube

En esta versión, el “importador” guarda base local. Para subir a la nube, usa la opción de exportación y carga en Sheets, o implementa el endpoint `upsertStudents` (ya incluido) desde un script adicional.

> Si quieres, en V3 puedo dejar el botón “📤 Subir nómina a Sync” desde el importador (batching automático).

## 3) Seguridad / privacidad

- No subas datos personales (nómina) a repositorios públicos.
- Si usas Sync, la planilla contiene datos personales: controla acceso y permisos.
- La API Key en un sitio publicado en GitHub Pages no es secreta. Para producción, se recomienda un backend real o un entorno privado/interno.

## Rutas

- `index.html` Inicio
- `tools/importer.html` Importación Excel
- `app/login.html` Login
- `app/dashboard.html` Panel (digitación + configuración)
- `dashboards/buses.html` Dashboard por bus
- `dashboards/cursos.html` Dashboard por curso
