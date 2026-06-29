# Iraurgi Ordu

Organizador web de horarios para equipos, entrenadores y pistas. Es un MVP funcional pensado para cuadrar una semana de entrenamientos sin backend: arrastra sesiones, edita recursos, detecta conflictos y guarda todo en `localStorage`.

**App en vivo:** https://rdcir.github.io/rdc-ordutegiak/

## Arquitectura

- **React + TypeScript + Vite**: base ligera, mantenible y fácil de desplegar en GitHub Pages.
- **dnd-kit + grid propia**: evita licencias premium y permite controlar validaciones, horarios fuera de rango y estados pendientes.
- **Funciones puras**: la validación vive en `src/lib/validation.ts`; las utilidades de hora en `src/lib/time.ts`.
- **Estado serializable**: `AppData` contiene equipos, entrenadores, pistas, sesiones y configuración semanal.
- **Persistencia local**: autosave en `localStorage`, exportación e importación JSON.

## Por que esta opcion

- FullCalendar Scheduler es potente, pero sus vistas de recursos avanzadas pertenecen a una oferta premium.
- DayPilot Scheduler tambien resuelve mucho, pero la licencia condiciona el despliegue y la evolución.
- Vanilla JS en un archivo seria simple al principio, pero menos mantenible para jugadores, disponibilidad, historiales o backend.
- React + Vite + dnd-kit permite un MVP usable, sin bloqueo de licencia y preparado para crecer.

## Funciones incluidas

- Vista semanal con dias, pistas y bloques de 30 minutos.
- Sesiones arrastrables desde pendientes al horario y entre huecos.
- Crear, editar y eliminar sesiones.
- Crear, editar y desactivar equipos, entrenadores y pistas.
- Si se desactiva una pista con sesiones, esas sesiones pasan a pendientes.
- Validacion visible de conflicto de pista, entrenador y equipo.
- Aviso de entrenador pendiente.
- Deteccion de sesion sin equipo, sin pista, sin hora, fin anterior/inferior a inicio y fuera del horario visible.
- Filtros por equipo, entrenador, pista y dia.
- Autosave, exportar JSON, importar JSON, restaurar datos de prueba y duplicar semana como sesiones pendientes.
- Deshacer el ultimo cambio (historial en memoria) desde la barra o desde el aviso.
- Copia de seguridad diaria automatica en el navegador (ultimas 7 jornadas).
- Importacion robusta: descarta entradas con formato invalido sin romper la app.
- Imprimir o guardar como PDF la vista actual en formato agenda (respeta los filtros: completo, por equipo o por entrenador).
- Interfaz bilingue euskara / castellano con interruptor; el idioma se guarda con la planificacion (por defecto euskara).
- Horario-marco por pista (cuando esta abierta cada dia) y disponibilidad por entrenador: colocar fuera marca error (pista cerrada) o aviso (entrenador no disponible); las horas cerradas de cada pista se sombrean en la rejilla.
- Necesidades por equipo (sesiones por semana, duracion, pista preferida y dias en los que no puede entrenar) como base del futuro generador; aviso si colocas un equipo en un dia que tiene prohibido.
- Sesiones fijas: marca una sesion con candado para que el generador no la mueva.

## Modelo de datos

- `Team`: id, nombre, categoria, color, notas, activo, necesidades (sesiones/semana, duracion, dias prohibidos, pista preferida).
- `Coach`: id, nombre, disponibilidad (texto), franjas de disponibilidad por dia, color, notas, activo.
- `Venue`: id, nombre, tipo, capacidad, horario-marco (franjas abiertas por dia), notas, activo.
- `TrainingSession`: id, equipo, entrenador opcional, pista, dia, inicio, fin, tipo, notas, estado y color.
- `WeekConfig`: dias visibles, horarios visibles, duracion de bloque, idioma, tema y criterio de color.

## Estructura

```text
src/
  App.tsx
  components/
    PlannerGrid.tsx
    ResourceEditorModal.tsx
    ResourcePanel.tsx
    SessionCard.tsx
    SessionEditorModal.tsx
    TopBar.tsx
  data/
    sampleData.ts
  lib/
    filtering.ts
    ids.ts
    storage.ts
    time.ts
    validation.ts
    validation.test.ts
  styles.css
  types.ts
```

## Abrir la app

### Opcion A (recomendada): archivo unico, doble clic

Genera un unico archivo HTML autonomo que funciona con doble clic, sin servidor ni internet:

```bash
./crear-html.command
```

(o `npm run build:app`). Esto crea `dist/iraurgi-ordu.html`. Haz doble clic en ese archivo y la app se abre en tu navegador. Puedes copiarlo donde quieras (Escritorio, una memoria USB, etc.); guarda los datos en el navegador con el que lo abras.

Importante: no abras el `index.html` de la carpeta raiz ni el de `dist/` con doble clic. El de la raiz necesita el servidor de Vite, y el de `dist/` carga el codigo como modulo y el navegador lo bloquea desde `file://`. Usa siempre `dist/iraurgi-ordu.html`.

### Opcion B: servidor de desarrollo (para editar el codigo)

```bash
./abrir-app.command
```

Tambien puedes hacer doble clic en `abrir-app.command` desde Finder. Si macOS no deja abrirlo por permisos, ejecuta una vez `chmod +x abrir-app.command`. Forma normal:

```bash
npm install
npm start
```

El script `npm start` abre el navegador automaticamente. Si no se abre, copia la URL que muestra Vite, normalmente `http://127.0.0.1:5173/`.

## Verificar

```bash
npm run test
npm run build
```

## Despliegue en GitHub Pages

El despliegue es automatico: cada push a `main` dispara el workflow
`.github/workflows/deploy.yml`, que hace el build de Vite y publica `dist/`
en GitHub Pages. La app queda en https://rdcir.github.io/rdc-ordutegiak/

El proyecto usa `base: "./"` en `vite.config.ts`, por lo que los assets se
cargan con rutas relativas y funciona servido desde el subdirectorio del repo.

Para revisar localmente el build final:

```bash
npm run open:preview
```

## Datos de prueba

Incluye 5 equipos, 4 entrenadores, 3 pistas y 8 sesiones. Una sesion empieza como pendiente y otra queda sin entrenador para mostrar el aviso no bloqueante.

## Tests minimos propuestos

- Validacion pura de choques de pista, entrenador y equipo.
- Sesion sin entrenador como warning.
- Sesiones fuera del horario visible.
- Movimiento por drag and drop a hueco ocupado.
- Importacion/exportacion JSON.
- Desactivacion de pista con sesiones asignadas.

## Limitaciones del MVP

- La planificacion es una semana tipo, no semanas con fecha real.
- Cada pista/entrenador admite una franja por dia (no varias franjas en el mismo dia, de momento).
- El deshacer es de un solo sentido (sin rehacer) y vive en memoria: se pierde al recargar.
- No hay backend ni multiusuario; las copias diarias son locales a este navegador.

## Version 2

- Jugadores y grupos.
- Disponibilidad personal y de espacios.
- Restricciones por categoria.
- Bloqueo de sesiones fijas.
- Historial de cambios con rehacer (redo) y deshacer multinivel persistente.
- Plantillas por temporada.
- Comparacion entre semanas.
- Backend con Supabase o Firebase para multiusuario.
