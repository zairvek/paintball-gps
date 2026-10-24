# Paintball GPS

App para partidas de paintball en un campo real: mapa satelital, zonas dibujadas por ti (límites, bases, reapariciones, zonas prohibidas, coberturas, objetivos) y posición GPS en vivo de tu equipo. Los rivales no ven tu posición; el árbitro ve a todos.

## Qué incluye
- `server.js` — servidor Node: sirve la app, guarda los mapas en `data/maps.json` y reparte posiciones por WebSocket.
- `public/` — la app (una sola página), instalable en el teléfono como aplicación.

## Probar en tu computadora
```bash
npm install
npm start
```
Abre http://localhost:3000. El GPS en el navegador solo funciona con HTTPS o en `localhost`, así que para probar con el teléfono tienes que subirlo a un servidor con HTTPS (abajo).

## Subirlo gratis (Render)
1. Sube esta carpeta a un repositorio de GitHub (sin la carpeta `node_modules`).
2. Entra en https://render.com → **New → Web Service** → conecta el repositorio.
3. Build command: `npm install` · Start command: `npm start` · plan Free.
4. Opcional: en **Environment** añade `ADMIN_PIN` con un PIN para que solo tú puedas guardar o borrar mapas.
5. Render te da una dirección `https://tu-app.onrender.com`. Ábrela en el teléfono.

Avisos del plan gratuito de Render: el servidor se duerme tras 15 minutos sin uso (el primer acceso tarda ~30 s) y el disco se borra en cada despliegue, así que los mapas guardados se pierden al volver a desplegar. Para que persistan, añade un disco en Render (de pago) o usa Railway/Fly.io con volumen, definiendo `DATA_DIR` a la ruta del disco. Alternativa: exporta `data/maps.json` y súbelo al repositorio.

Variables de entorno:
- `PORT` — puerto (Render la define sola).
- `ADMIN_PIN` — PIN para guardar o borrar mapas. Vacío = cualquiera puede.
- `DATA_DIR` — carpeta donde guardar `maps.json`.

## Instalar como app en Android
- **Sin APK (lo más rápido):** abre la dirección en Chrome → menú ⋮ → **Instalar aplicación** (o "Añadir a pantalla de inicio"). Se abre a pantalla completa con GPS.
- **Generar APK:** entra en https://www.pwabuilder.com, pega la dirección de tu servidor, pulsa **Package for stores → Android** y descarga el `.apk` (o el `.aab` para Google Play). PWABuilder usa el `manifest.webmanifest` y los iconos que ya están incluidos.
- También puedes envolverla con Capacitor o Android Studio (WebView apuntando a tu dirección) si quieres control total.

## Cómo se juega
1. Alguien dibuja el campo: **Dibujar un campo nuevo** → ve al lugar o búscalo moviendo el mapa → elige un tipo de zona en la barra inferior → toca las esquinas → **Terminar** → **Guardar**.
2. Cada jugador escribe su nombre, el mismo **código de partida**, elige equipo y el mapa, y pulsa **Entrar**.
3. En la partida: tu punto es el blanco con borde dorado; tus compañeros aparecen con su nombre, distancia y flecha de dirección. Arriba se ve cuántos quedan vivos por equipo.
4. Si te eliminan, pulsa **Me dieron**; cuando reapareces, **Vuelvo al juego**.

## Consejos de uso en campo
- Activa "Alta precisión" en la ubicación del teléfono; la precisión típica es de 3 a 10 m al aire libre.
- La pantalla no se apaga mientras la partida está abierta (si el teléfono lo permite).
- Las imágenes satelitales son de Esri y las calles de OpenStreetMap; no hacen falta claves. Si prefieres Google Maps, necesitarías una clave de la API de Google y cambiar la capa en `baseLayers()` de `public/index.html`.
