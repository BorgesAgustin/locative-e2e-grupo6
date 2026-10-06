# Locative E2E — Grupo 6

Suite de pruebas automatizadas con **Playwright** sobre el sistema **Locative** del Grupo 8
(`https://proyecto-inmobiliario.vercel.app`), para el TP N.º 1 de Ingeniería de Software II (UNaM).

| Archivo | Caso de uso | Casos |
|---|---|---|
| `tests/cu18-registrar-propiedad.spec.js` | CU18 Registrar propiedad | CP-CU18-01 a 05, 07 y 13 |
| `tests/control-acceso.spec.js` | CU18 (precondición) | CP-CU18-08, CP-CU18-09 |
| `tests/cu12-consultar-pagos.spec.js` | CU12 Consultar estado de pagos | CP-CU12-00, 01 y 06 |
| `tests/caja-blanca.spec.js` | CU18 (caja blanca sobre el código del cliente) | CP-CU18-20, 21 y 22 |

## Pruebas de caja blanca

No se tuvo el repositorio del Grupo 8, pero el código del frontend se descarga en el navegador
(`/assets/index-*.js`) y se puede leer desde las herramientas de desarrollo. Sobre ese código se aplicó
la prueba del camino básico a tres funciones del alta de propiedades:

| Caso | Función | V(G) | Cómo se recorren los caminos |
|---|---|---|---|
| CP-CU18-20 | validación del formulario | 13 | Se desactiva la validación nativa del navegador (`noValidate`) y se altera un campo por camino. |
| CP-CU18-21 | control de acceso por rol | 4 | Se demora o se bloquea el pedido del perfil a Supabase (`page.route`). |
| CP-CU18-22 | rama de error al guardar | – | Se simula la respuesta de Supabase: falla de red, rechazo por permisos y error sin mensaje. |

Ninguna de estas pruebas crea datos: `bloquearEscrituras()` corta cualquier alta en la tabla `properties`.
El análisis mostró que el sistema sí valida la superficie cubierta al guardar: DEF-CU18-04 fue un falso
positivo y CP-CU18-13 ahora envía el formulario y verifica el mensaje.

Los casos que documentan un defecto conocido están marcados con `test.fail()`: el reporte los
muestra como «expected failure» y, si el Grupo 8 corrige el defecto, Playwright avisa que la
expectativa cambió.

## Ejecución en GitHub Actions

El workflow `.github/workflows/e2e.yml` corre en cada *push* a `main` y a mano desde
**Actions → E2E Locative → Run workflow**. Al correrlo a mano se puede tildar
`permitir_escritura` para ejecutar también los casos que crean propiedades `QA6-AUTO …`.

Secretos necesarios (*Settings → Secrets and variables → Actions*):
`INMOBILIARIA_PASSWORD`, `INQUILINO_PASSWORD`, `PROPIETARIO_PASSWORD`.
Sin ellos, los casos con sesión quedan «omitidos».

El reporte HTML y las capturas se descargan desde la ejecución, en **Artifacts**.

## Ejecución local

```bash
npm ci
npx playwright install chromium firefox
cp .env.example .env   # completar las contraseñas
npm test               # sin escritura
npm run test:escritura # incluye CP-CU18-01 y CP-CU18-04
npm run report
```

## Reglas de convivencia con el sistema bajo prueba

- Ejecución en serie (`workers: 1`) para no sobrecargar un despliegue compartido.
- Todo dato creado lleva el prefijo `QA6-` para identificarlo y limpiarlo.
- La escritura está desactivada por defecto y sólo se habilitó con el acuerdo del Grupo 8.
