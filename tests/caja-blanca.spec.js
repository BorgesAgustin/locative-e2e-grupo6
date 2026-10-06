// @ts-check
// Pruebas de CAJA BLANCA sobre el código del cliente de Locative (Grupo 8).
//
// No se tuvo el repositorio del Grupo 8, pero el navegador descarga todo el código del frontend
// (/assets/index-*.js, publicado el 02/10/2026). Se leyó desde las herramientas del navegador
// (pestaña Sources) y se aplicó la prueba del camino básico a tres funciones del alta de propiedades:
//
//   CP-CU18-20  validar()        validación propia del formulario      12 decisiones → V(G) = 13
//   CP-CU18-21  RutaProtegida    control de acceso por rol             3 decisiones  → V(G) = 4
//   CP-CU18-22  guardar()        rama de error (catch) al guardar      + traducción del error
//
// Ninguna prueba crea datos: bloquearEscrituras() corta cualquier alta en la tabla «properties».
const { test, expect } = require('@playwright/test');
const {
  usarSesion, F, abrirAlta, completarAlta, bloquearEscrituras, sinValidacionNativa, vaciarSelect, mensajeError, centrar,
} = require('./helpers');

/** Datos válidos: a partir de ellos, cada camino altera un solo campo. */
const VALIDOS = {
  titulo: 'QA6- caja blanca (no se guarda)', tipo: 'departamento', operacion: 'alquiler', precio: 250000,
  provincia: 'Misiones', ciudad: 'Posadas', barrio: 'QA6- Centro', direccion: 'QA6- Av. Mitre 1234',
  dormitorios: 2, banos: 1, supTotal: 60, supCubierta: 55,
  descripcion: 'QA6- Datos de la suite automatizada del Grupo 6. No se guardan.',
};

const guardar = (page) => page.getByRole('button', { name: 'Guardar propiedad' }).click();

// ─────────────── CP-CU18-20 - Camino básico de validar() ───────────────
// validar() es una cadena de 12 decisiones (if / else if): un camino por cada mensaje de error,
// más el camino válido (13), que guarda la propiedad y ya está cubierto por CP-CU18-01.
// El camino 7 tiene una condición compuesta (!precio || precio <= 0): 7a y 7b cubren ambas condiciones.
const CAMINOS = [
  // [camino, qué se altera, cómo, mensaje que debe mostrar el sistema]
  ['1', 'título vacío', (p) => p.fill(F.titulo, '   '), 'El título es obligatorio.'],
  ['2', 'sin operación', (p) => vaciarSelect(p, F.operacion), 'Seleccioná la operación.'],
  ['3', 'sin tipo de inmueble', (p) => vaciarSelect(p, F.tipo), 'Seleccioná el tipo de inmueble.'],
  ['4', 'sin provincia', (p) => p.selectOption(F.provincia, ''), 'Seleccioná una provincia.'],
  ['5', 'sin ciudad', (p) => p.selectOption(F.ciudad, ''), 'Seleccioná una ciudad o localidad.'],
  ['6', 'dirección vacía', (p) => p.fill(F.direccion, '   '), 'La dirección es obligatoria.'],
  ['7a', 'precio vacío', (p) => p.fill(F.precio, ''), 'El precio debe ser mayor a 0.'],
  ['7b', 'precio 0', (p) => p.fill(F.precio, '0'), 'El precio debe ser mayor a 0.'],
  ['8', 'dormitorios negativos', (p) => p.fill(F.dormitorios, '-1'), 'La cantidad de dormitorios no puede ser negativa.'],
  ['9', 'baños negativos', (p) => p.fill(F.banos, '-1'), 'La cantidad de baños no puede ser negativa.'],
  ['10', 'superficie total negativa', (p) => p.fill(F.supTotal, '-1'), 'La superficie total no puede ser negativa.'],
  ['11', 'superficie cubierta negativa', (p) => p.fill(F.supCubierta, '-1'), 'La superficie cubierta no puede ser negativa.'],
  ['12', 'cubierta mayor que total', async (p) => { await p.fill(F.supTotal, '100'); await p.fill(F.supCubierta, '250'); },
    'La superficie cubierta no puede ser mayor que la superficie total.'],
];

test.describe('CP-CU18-20 - camino básico de validar() (caja blanca)', () => {
  usarSesion('inmobiliaria');
  for (const [camino, que, provocar, mensaje] of CAMINOS) {
    test(`CP-CU18-20 - camino ${camino}: ${que}`, async ({ page }) => {
      const intentos = await bloquearEscrituras(page);
      await abrirAlta(page);
      await completarAlta(page, VALIDOS);
      // La validación nativa (required, min) frena el envío antes de llegar a validar():
      // se desactiva para recorrer las ramas internas, como se haría desde el inspector.
      await sinValidacionNativa(page);
      await provocar(page);
      await guardar(page);
      await expect(mensajeError(page)).toHaveText(mensaje);
      await centrar(mensajeError(page)); // evidencia: el mensaje queda en la captura final
      await expect(page).toHaveURL(/\/propiedades\/nueva$/);
      expect(intentos, 'validar() debe cortar antes de intentar guardar').toEqual([]);
    });
  }
});

// ─────────────── CP-CU18-21 - Caminos de RutaProtegida ───────────────
// cargando ? "Cargando sesion..." : autenticado ? (!perfil || !rolPermitido ? "Acceso no autorizado" : página) : /login
// Caminos: 1 cargando · 2 sin sesión (CP-CU18-08) · 3 sin perfil o rol no permitido (CP-CU18-09) · 4 rol permitido.
// La condición compuesta del camino 3 se cubre con sus dos condiciones: sin perfil (acá) y rol no permitido (CP-CU18-09).
test.describe('CP-CU18-21 - caminos del control de acceso por rol (caja blanca)', () => {
  usarSesion('inmobiliaria');

  test('CP-CU18-21 - camino 1: mientras se carga el perfil muestra "Cargando sesion..."', async ({ page }) => {
    let liberar = () => {};
    const espera = new Promise((r) => { liberar = r; });
    await page.route('**/rest/v1/profiles**', async (route) => { await espera; await route.continue(); });
    await page.goto('/inmobiliaria/propiedades/nueva');
    await expect(page.getByText('Cargando sesion...')).toBeVisible();
    await test.info().attach('camino 1 - Cargando sesion', { body: await page.screenshot(), contentType: 'image/png' });
    liberar();
    await expect(page.locator(F.titulo)).toBeVisible(); // al terminar la carga sigue por el camino 4
  });

  test('CP-CU18-21 - camino 3 (sin perfil): con sesión pero sin perfil muestra "Acceso no autorizado"', async ({ page }) => {
    // Desde el inspector: bloquear el pedido del perfil. Supabase devuelve error y el perfil queda vacío.
    await page.route('**/rest/v1/profiles**', (route) => route.abort('failed'));
    await page.goto('/inmobiliaria/propiedades/nueva');
    await expect(page.getByRole('heading', { name: 'Acceso no autorizado' })).toBeVisible();
    await expect(page.locator(F.titulo)).toHaveCount(0);
  });

  test('CP-CU18-21 - camino 4: con rol permitido muestra el formulario de alta', async ({ page }) => {
    await page.goto('/inmobiliaria/propiedades/nueva');
    await expect(page.locator(F.titulo)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Acceso no autorizado' })).toHaveCount(0);
  });
});

// ─────────────── CP-CU18-22 - Rama de error de guardar() ───────────────
// try { guardar } catch (e) { mostrar(traducirError(e, 'No se pudo guardar la propiedad.')) } finally { habilitar botón }
// Se simula la respuesta del servidor (stub) para recorrer el catch sin crear datos.
const CORS = { 'access-control-allow-origin': '*' };
const ERRORES = [
  ['falla de red', (route) => route.abort('failed'),
    'No se pudo conectar con el servicio. Revisá tu conexión e intentá nuevamente.'],
  ['rechazo por permisos (RLS)', (route) => route.fulfill({
    status: 403, headers: CORS, contentType: 'application/json',
    body: JSON.stringify({ code: '42501', message: 'new row violates row-level security policy for table "properties"' }),
  }), 'No tenés permisos para realizar esta acción.'],
  ['error sin mensaje', (route) => route.fulfill({ status: 500, headers: CORS, contentType: 'application/json', body: '{}' }),
    'No se pudo guardar la propiedad.'],
];

test.describe('CP-CU18-22 - rama de error al guardar (caja blanca)', () => {
  usarSesion('inmobiliaria');
  for (const [nombre, responder, mensaje] of ERRORES) {
    test(`CP-CU18-22 - ${nombre}`, async ({ page }) => {
      const escrituras = [];
      await page.route('**/rest/v1/properties**', (route) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.continue();
        escrituras.push(route.request().method());
        return responder(route);
      });
      await abrirAlta(page);
      await completarAlta(page, VALIDOS);
      await guardar(page);
      await expect(mensajeError(page)).toHaveText(mensaje);
      await centrar(mensajeError(page));
      await expect(page).toHaveURL(/\/propiedades\/nueva$/);
      // finally: el botón vuelve a habilitarse para reintentar.
      await expect(page.getByRole('button', { name: 'Guardar propiedad' })).toBeEnabled();
      expect(escrituras, 'el guardado debe haberse intentado (y respondido por el stub)').toEqual(['POST']);
    });
  }
});
