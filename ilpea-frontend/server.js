//require('dotenv').config();
process.env.API_URL
const express = require('express');
const session = require('express-session');
const fetch   = require('node-fetch');
const path    = require('path');

const app = express();
const PORT    = process.env.PORT    || 4000;
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'ilpea_frontend_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 12 * 60 * 60 * 1000 },
}));

// ── Inyectar usuario en todas las vistas ───────────────────────────────
app.use((req, res, next) => {
  res.locals.user        = req.session.user  || null;
  res.locals.token       = req.session.token || null;
  res.locals.API_URL     = API_URL;
  res.locals.currentPath = req.path;
  next();
});

// ── Auth guard ─────────────────────────────────────────────────────────
function requireAuth(...roles) {
  return (req, res, next) => {
    if (!req.session.token) return res.redirect('/login');
    if (roles.length && !roles.includes(req.session.user?.role)) {
      return res.status(403).render('error', { message: 'Acceso no permitido' });
    }
    next();
  };
}

// ── Helper: fetch autenticado contra la API ────────────────────────────
async function apiFetch(token, path, opts = {}) {
  const r = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

// ── Helper: obtener turnos desde la BD (nunca hardcodeados) ───────────
// CORRECCIÓN: los turnos se leen de la API, no de una lista fija.
// Si tu API no tiene un endpoint /shifts aún, crea uno; mientras tanto
// se usa esta función que intenta obtenerlos y cae en fallback vacío.
async function fetchShifts(token) {
  try {
    const { ok, data } = await apiFetch(token, '/shifts');
    if (ok && Array.isArray(data)) return data;
  } catch { /* continúa con fallback */ }
  // Fallback: lista vacía si falla la API
  return [];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  if (req.session.token) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.token) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const r = await fetch(`${API_URL}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) return res.render('login', { error: data.error || 'Credenciales inválidas' });

    req.session.token = data.token;
    req.session.user  = data.user;
    res.redirect('/dashboard');
  } catch {
    res.render('login', { error: 'No se pudo conectar con el servidor' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════
app.get('/dashboard', requireAuth(), (req, res) => {
  const role = req.session.user.role;
  if (role === 'ADMIN')   return res.redirect('/admin/dashboard');
  if (role === 'MANAGER') return res.redirect('/manager/servicios');
  return res.redirect('/empleado/mi-turno');
});

// ════════════════════════════════════════════════════════════════════════
// EMPLOYEE
// ════════════════════════════════════════════════════════════════════════
app.get('/empleado/mi-turno', requireAuth('EMPLOYEE', 'MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { ok, data } = await apiFetch(req.session.token, '/me');
    res.render('employee/mi-turno', { data: ok ? data : null });
  } catch {
    res.render('employee/mi-turno', { data: null });
  }
});

// ════════════════════════════════════════════════════════════════════════
// MANAGER
// ════════════════════════════════════════════════════════════════════════
app.get('/manager/servicios', requireAuth('MANAGER', 'ADMIN'), async (req, res) => {
  const shifts = await fetchShifts(req.session.token);
  res.render('manager/servicios', {
    services:      [],
    shifts,
    selectedShift: '',
    selectedDate:  today(),
  });
});

// Datos de servicios para el fetch del frontend (tabla de servicios y asignaciones)
app.get('/manager/servicios/datos', requireAuth('MANAGER', 'ADMIN'), async (req, res) => {
  const { shift_id, date, page, limit } = req.query;
  const params = new URLSearchParams({ date });
  if (shift_id) params.append('shift_id', shift_id);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  try {
    const { ok, status, data } = await apiFetch(req.session.token, `/services?${params.toString()}`);
    console.log(`[DEBUG] /manager/servicios/datos: params=${params.toString()}, ok=${ok}, status=${status}`);
    res.json(ok ? data : { data: [], total: 0 });
  } catch (err) {
    console.error(`[DEBUG] Error fetch services: ${err.message}`);
    res.json({ data: [], total: 0 });
  }
});

// CORRECCIÓN: ahora pasa `shifts` a la vista de asignaciones
// para que los dropdowns del modal de crear/reasignar funcionen.
app.get('/manager/asignaciones', requireAuth('MANAGER', 'ADMIN'), async (req, res) => {
  const shifts = await fetchShifts(req.session.token);
  res.render('manager/asignaciones', { shifts });
});

app.get('/manager/usuarios', requireAuth('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const page = req.query.page || 1;
    const { ok, data } = await apiFetch(req.session.token, `/users?page=${page}&limit=10`);
    res.render('manager/usuarios', { 
      users: ok ? data.data : [], 
      total: ok ? data.total : 0,
      page: ok ? data.page : 1,
      limit: ok ? data.limit : 10
    });
  } catch {
    res.render('manager/usuarios', { users: [], total: 0, page: 1, limit: 10 });
  }
});

// ════════════════════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════════════════════
app.get('/admin/dashboard', requireAuth('ADMIN'), async (req, res) => {
  try {
    const [ovRes, svRes] = await Promise.all([
      apiFetch(req.session.token, '/dashboard/overview'),
      apiFetch(req.session.token, '/dashboard/services'),
    ]);
    res.render('admin/dashboard', {
      overview: ovRes.ok ? ovRes.data : {},
      services: svRes.ok && Array.isArray(svRes.data) ? svRes.data : [],
    });
  } catch {
    res.render('admin/dashboard', { overview: {}, services: [] });
  }
});

app.get('/admin/rutas', requireAuth('ADMIN'), async (req, res) => {
  try {
    const page = req.query.page || 1;
    const { ok, data } = await apiFetch(req.session.token, `/routes?page=${page}&limit=10`);
    res.render('admin/rutas', { 
      routes: ok ? data.data : [], 
      total: ok ? data.total : 0,
      page: ok ? data.page : 1,
      limit: ok ? data.limit : 10
    });
  } catch {
    res.render('admin/rutas', { routes: [], total: 0, page: 1, limit: 10 });
  }
});

app.get('/admin/usuarios', requireAuth('ADMIN'), async (req, res) => {
  try {
    const page = req.query.page || 1;
    const { ok, data } = await apiFetch(req.session.token, `/users?page=${page}&limit=10`);
    res.render('manager/usuarios', { 
      users: ok ? data.data : [], 
      total: ok ? data.total : 0,
      page: ok ? data.page : 1,
      limit: ok ? data.limit : 10
    });
  } catch {
    res.render('manager/usuarios', { users: [], total: 0, page: 1, limit: 10 });
  }
});

// ════════════════════════════════════════════════════════════════════════
// PROXY — reenvía llamadas AJAX del browser a la API con el token
// ════════════════════════════════════════════════════════════════════════
app.use('/proxy', requireAuth(), async (req, res) => {
  const url = `${API_URL}${req.url}`; // ej: /proxy/assignments → /api/assignments
  try {
    const r = await fetch(url, {
      method:  req.method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${req.session.token}`,
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch {
    res.status(500).json({ error: 'Error de conexión con el API' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// 404 / Error global
// ════════════════════════════════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).render('error', { message: 'Página no encontrada' });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('error', { message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🖥️  ILPEA Frontend en http://localhost:${PORT}`);
  console.log(`🔗 Conectado al API en ${API_URL}`);
});