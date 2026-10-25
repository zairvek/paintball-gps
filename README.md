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

## Obtener el APK para Android
Necesitas antes el servidor subido con HTTPS (paso anterior).

1. Abre https://www.pwabuilder.com en la computadora.
2. Pega la dirección de tu servidor (por ejemplo `https://tu-app.onrender.com`) y pulsa **Start**.
3. Pulsa **Package for stores** → **Android** → **Generate package**. Deja las opciones por defecto (el nombre, colores e iconos salen del `manifest.webmanifest` incluido).
4. Descarga el `.zip`. Dentro vienen:
   - `*.apk` → el archivo que instalas en los teléfonos.
   - `signing.keystore` y `signing-key-info.txt` → **guárdalos**: los necesitas para publicar actualizaciones con la misma firma.
   - `assetlinks.json` → cópialo a `public/.well-known/assetlinks.json`, vuelve a desplegar y la app se abrirá sin la barra de dirección del navegador.
5. Pasa el `.apk` al teléfono (WhatsApp, Drive, cable) y ábrelo. Android pedirá permitir "instalar apps de fuentes desconocidas" la primera vez.

Sin APK también funciona: abre la dirección en Chrome → menú ⋮ → **Instalar aplicación**.

## Crear el campo caminando (más preciso)
Ve al campo, pulsa **Crear un campo** y elige en la barra inferior qué vas a marcar (límite, base, zona prohibida…). Arriba ves la calidad del GPS: lo ideal es ±5 m o mejor.

- **Esquina aquí** (recomendado para campos con esquinas): ve a cada esquina, quédate quieto y púlsalo. La app mide 5 segundos y promedia las lecturas. Repite en cada esquina y pulsa **Terminar**.
- **Grabar caminando** (para bordes curvos): pulsa y camina por el borde. Solo guarda lecturas con precisión de ±15 m o mejor y quita los puntos sobrantes al terminar. Cuando vuelves al punto de inicio, el teléfono vibra.
- Para puntos (reapariciones, búnkeres, banderas), ponte encima y pulsa **Marcar aquí**.
- Puedes mezclar: tocar el mapa, medir esquinas y grabar en la misma zona.
- Lo que dibujas se guarda como borrador en el teléfono hasta que pulsas **Guardar**, así no se pierde si se cierra la app.
- Arriba aparece el área y el perímetro del campo.

## Cómo se juega
1. Alguien crea el campo (en el mapa o caminando, ver arriba) y pulsa **Guardar**.
2. Cada jugador escribe su nombre, el mismo **código de partida**, elige equipo y el mapa, y pulsa **Entrar**.
3. En la partida: tu punto es el blanco con borde dorado; tus compañeros aparecen con su nombre, distancia y flecha de dirección. Arriba se ve cuántos quedan vivos por equipo.
4. Si sales del límite del campo o entras en una zona prohibida, sale un aviso rojo y el teléfono vibra.
5. Si te eliminan, pulsa **Me dieron**: verás una flecha y la distancia hasta tu reaparición. Al llegar vibra; pulsa **Vuelvo al juego**.

## Consejos de uso en campo
- Activa "Alta precisión" en la ubicación del teléfono; la precisión típica es de 3 a 10 m al aire libre.
- La pantalla no se apaga mientras la partida está abierta (si el teléfono lo permite).
- Las imágenes satelitales son de Esri y las calles de OpenStreetMap; no hacen falta claves. Si prefieres Google Maps, necesitarías una clave de la API de Google y cambiar la capa en `baseLayers()` de `public/index.html`.
