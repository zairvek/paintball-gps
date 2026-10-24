'use strict';
// Servidor de Paintball GPS: sirve la app, guarda los mapas del campo y
// reparte las posiciones GPS en vivo entre compañeros de equipo.
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '';        // si lo defines, hace falta para guardar o borrar mapas
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const MAPS_FILE = path.join(DATA_DIR, 'maps.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
let maps = {};
try { maps = JSON.parse(fs.readFileSync(MAPS_FILE, 'utf8')); } catch (e) { maps = {}; }
let saveTimer = null;
function saveMaps() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(MAPS_FILE, JSON.stringify(maps), err => { if (err) console.error('No se pudo guardar maps.json', err); });
  }, 300);
}

const app = express();
// CORS: la app instalada (APK) carga sus archivos desde el teléfono y llama a este servidor desde otro origen.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'content-type,x-pin');
  res.set('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public'), { etag: true }));

function checkPin(req, res) {
  if (ADMIN_PIN && req.get('x-pin') !== ADMIN_PIN) { res.status(403).json({ error: 'PIN incorrecto' }); return false; }
  return true;
}
app.get('/api/config', (req, res) => res.json({ pinRequired: !!ADMIN_PIN }));
app.get('/api/maps', (req, res) => {
  res.json(Object.values(maps).map(m => ({ id: m.id, name: m.name, center: m.center, zoom: m.zoom, features: m.features.length, updatedAt: m.updatedAt })));
});
app.get('/api/maps/:id', (req, res) => {
  const m = maps[req.params.id]; if (!m) return res.status(404).json({ error: 'Mapa no encontrado' }); res.json(m);
});
app.put('/api/maps/:id', (req, res) => {
  if (!checkPin(req, res)) return;
  const id = String(req.params.id).replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
  const b = req.body || {};
  if (!id || typeof b.name !== 'string' || !Array.isArray(b.features)) return res.status(400).json({ error: 'Datos del mapa incompletos' });
  const m = {
    id, name: b.name.slice(0, 60),
    center: Array.isArray(b.center) ? b.center.slice(0, 2).map(Number) : null,
    zoom: Number(b.zoom) || 17,
    features: b.features.slice(0, 500).map(f => ({
      id: String(f.id || '').slice(0, 40), kind: String(f.kind || 'nota').slice(0, 20), label: String(f.label || '').slice(0, 40),
      geom: f.geom === 'point' ? 'point' : 'polygon',
      coords: Array.isArray(f.coords) ? f.coords.slice(0, 400).map(c => [Number(c[0]), Number(c[1])]) : []
    })),
    updatedAt: Date.now()
  };
  maps[id] = m; saveMaps();
  broadcastAll({ t: 'maps' });
  res.json(m);
});
app.delete('/api/maps/:id', (req, res) => {
  if (!checkPin(req, res)) return;
  delete maps[req.params.id]; saveMaps(); broadcastAll({ t: 'maps' }); res.json({ ok: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// games[code] = { map, players: Map<id, {ws, id, name, team, lat, lng, acc, heading, speed, out, at}> }
const games = {};
const TEAMS = new Set(['r', 'b', 'ref']);

function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function broadcastAll(obj) { for (const ws of wss.clients) send(ws, obj); }
function publicPlayer(p) { return { id: p.id, name: p.name, team: p.team, lat: p.lat, lng: p.lng, acc: p.acc, heading: p.heading, speed: p.speed, out: p.out, at: p.at }; }
function visibleFor(game, me) {
  // Cada jugador ve a sus compañeros; los árbitros (ref) ven a todos; de los rivales solo se envía cuántos quedan.
  const list = [];
  let aliveR = 0, aliveB = 0, totalR = 0, totalB = 0;
  for (const p of game.players.values()) {
    if (p.team === 'r') { totalR++; if (!p.out) aliveR++; }
    if (p.team === 'b') { totalB++; if (!p.out) aliveB++; }
    if (p.id === me.id) continue;
    if (me.team === 'ref' || p.team === me.team || p.team === 'ref') list.push(publicPlayer(p));
  }
  return { players: list, counts: { r: [aliveR, totalR], b: [aliveB, totalB] } };
}
function pushGame(code) {
  const game = games[code]; if (!game) return;
  for (const p of game.players.values()) send(p.ws, { t: 'players', ...visibleFor(game, p) });
}
const pushTimers = {};
function schedulePush(code) {
  if (pushTimers[code]) return;
  pushTimers[code] = setTimeout(() => { delete pushTimers[code]; pushGame(code); }, 700);
}

wss.on('connection', ws => {
  let me = null, code = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    if (msg.t === 'join') {
      const c = String(msg.game || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!c) return send(ws, { t: 'error', error: 'Código de partida inválido' });
      if (me && code) leave();
      code = c;
      if (!games[code]) games[code] = { map: maps[msg.map] ? msg.map : null, players: new Map(), createdAt: Date.now() };
      if (!games[code].map && maps[msg.map]) games[code].map = msg.map;
      const id = String(msg.id || Math.random().toString(36).slice(2, 10)).slice(0, 16);
      me = { ws, id, name: String(msg.name || 'Jugador').slice(0, 20), team: TEAMS.has(msg.team) ? msg.team : 'r', lat: null, lng: null, acc: null, heading: null, speed: null, out: false, at: Date.now() };
      games[code].players.set(id, me);
      send(ws, { t: 'joined', you: id, game: code, map: games[code].map, ...visibleFor(games[code], me) });
      pushGame(code);
    } else if (!me) {
      return;
    } else if (msg.t === 'pos') {
      me.lat = Number(msg.lat); me.lng = Number(msg.lng); me.acc = Number(msg.acc) || null;
      me.heading = msg.heading == null ? null : Number(msg.heading); me.speed = msg.speed == null ? null : Number(msg.speed); me.at = Date.now();
      schedulePush(code);
    } else if (msg.t === 'status') {
      me.out = !!msg.out; me.at = Date.now(); pushGame(code);
    } else if (msg.t === 'team') {
      if (TEAMS.has(msg.team)) { me.team = msg.team; pushGame(code); }
    } else if (msg.t === 'leave') {
      leave();
    }
  });
  function leave() {
    if (!me || !code || !games[code]) return;
    games[code].players.delete(me.id);
    if (games[code].players.size === 0) delete games[code]; else pushGame(code);
    me = null; code = null;
  }
  ws.on('close', leave);
  ws.on('error', leave);
});
// Expulsa conexiones muertas (túneles, pérdida de señal) cada 30 s
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }
}, 30000);

server.listen(PORT, () => console.log(`Paintball GPS escuchando en http://localhost:${PORT}`));
