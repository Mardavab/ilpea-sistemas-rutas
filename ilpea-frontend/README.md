# 🖥️ ILPEA Frontend — LinceHackatec 2026

Frontend web desarrollado con **Node.js + Express + EJS**, conectado al backend REST de ILPEA.

---

## 🚀 Inicio Rápido — Stack Completo (Frontend + Backend + DB)

Coloca ambas carpetas al mismo nivel:

```
proyecto/
├── docker-compose.yml       ← Este archivo (stack completo)
├── ilpea-backend/
└── ilpea-frontend/
```

Luego ejecuta **un solo comando**:

```bash
docker compose up --build
```

| Servicio   | URL                        |
|------------|----------------------------|
| 🌐 Frontend | http://localhost:4000       |
| 🔌 API REST | http://localhost:3000/api  |
| 🗄️ MySQL   | localhost:3306             |

---

## 🔑 Credenciales de Acceso

| Rol      | Email                 | Contraseña |
|----------|-----------------------|------------|
| ADMIN    | admin@ilpea.com       | password   |
| MANAGER  | manager@ilpea.com     | password   |
| EMPLOYEE | employee@ilpea.com    | password   |

---

## 📁 Estructura del Frontend

```
ilpea-frontend/
├── server.js                  ← Express server + rutas + proxy al API
├── package.json
├── Dockerfile
├── .env.example
├── public/
│   ├── css/main.css           ← Estilos (tema oscuro industrial)
│   └── js/main.js             ← Utilidades cliente (toasts, modals)
└── views/
    ├── login.ejs
    ├── error.ejs
    ├── partials/
    │   ├── header.ejs         ← Sidebar + nav dinámica por rol
    │   └── footer.ejs
    ├── employee/
    │   └── mi-turno.ejs       ← Vista de turno asignado
    ├── manager/
    │   ├── servicios.ejs      ← Monitoreo de rutas por turno
    │   ├── asignaciones.ejs   ← Gestión de asignaciones
    │   └── usuarios.ejs       ← CRUD de empleados
    └── admin/
        ├── dashboard.ejs      ← Métricas globales
        ├── rutas.ejs          ← CRUD de rutas
        └── usuarios.ejs       ← CRUD completo de usuarios
```

---

## 🔗 Cómo se Conecta el Frontend con el Backend

### 1. Variables de Entorno

El frontend lee la URL del API desde la variable `API_URL`:

```env
API_URL=http://localhost:3000/api   # desarrollo local
API_URL=http://api:3000/api         # dentro de Docker (nombre del servicio)
```

### 2. Flujo de Autenticación

```
Usuario → POST /login (frontend) → fetch POST /api/auth/login (backend)
                                        ↓
                              Recibe JWT token
                                        ↓
                        req.session.token = token  (sesión Express)
                                        ↓
                        Todas las vistas usan este token automáticamente
```

### 3. Proxy Integrado

El servidor Express actúa como proxy para las acciones del navegador:

```
Navegador → POST /proxy/users   →   fetch POST /api/users  (con JWT)
Navegador → PUT  /proxy/routes/1 →  fetch PUT  /api/routes/1 (con JWT)
```

El JWT **nunca se expone al navegador**, vive solo en la sesión del servidor.

### 4. Server-Side Rendering

Las vistas que necesitan datos al cargar (dashboard, listas) hacen el fetch en el servidor:

```javascript
// En server.js
app.get('/admin/dashboard', requireAuth('ADMIN'), async (req, res) => {
  const overview = await fetch(`${API_URL}/dashboard/overview`, {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  res.render('admin/dashboard', { overview: await overview.json() });
});
```

---

## 🛠️ Desarrollo Local (sin Docker)

```bash
# 1. Asegúrate de tener el backend corriendo en localhost:3000

# 2. Instalar dependencias del frontend
cd ilpea-frontend
npm install

# 3. Crear .env
cp .env.example .env
# Editar: API_URL=http://localhost:3000/api

# 4. Iniciar
npm run dev   # con nodemon (recarga automática)
# o
npm start
```

---

## 🗺️ Rutas del Frontend por Rol

| Ruta                      | Rol requerido         | Descripción                        |
|---------------------------|-----------------------|------------------------------------|
| `/login`                  | Público               | Página de acceso                   |
| `/empleado/mi-turno`      | EMPLOYEE+             | Ver turno y ruta asignada          |
| `/manager/servicios`      | MANAGER+              | Monitoreo de rutas por turno/fecha |
| `/manager/asignaciones`   | MANAGER+              | Crear/editar/eliminar asignaciones |
| `/manager/usuarios`       | MANAGER+              | CRUD de empleados                  |
| `/admin/dashboard`        | ADMIN                 | Métricas globales del sistema      |
| `/admin/rutas`            | ADMIN                 | CRUD de rutas y vehículos          |
| `/admin/usuarios`         | ADMIN                 | CRUD completo de usuarios          |
