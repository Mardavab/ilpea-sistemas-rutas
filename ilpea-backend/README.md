# 🚌 ILPEA Backend — LinceHackatec 2026

**Optimización Inteligente de Rutas y Aforos para Turnos**

Backend REST API desarrollado con **Node.js + Express + MySQL**, desplegable con un solo comando mediante **Docker Compose**.

---

## 📋 Tabla de Contenidos

- [Requisitos](#requisitos)
- [Inicio Rápido](#inicio-rápido)
- [Credenciales por Defecto](#credenciales-por-defecto)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Roles y Permisos](#roles-y-permisos)
- [Endpoints](#endpoints)
- [Lógica de Negocio](#lógica-de-negocio)
- [Variables de Entorno](#variables-de-entorno)

---

## ✅ Requisitos

- [Docker](https://www.docker.com/) y Docker Compose instalados
- Puerto **3000** (API) y **3306** (MySQL) disponibles

---

## 🚀 Inicio Rápido

```bash
# 1. Clonar / descomprimir el proyecto
cd ilpea-backend

# 2. Levantar con un solo comando
docker compose up --build

# La API estará lista en:
# http://localhost:3000
```

> La base de datos se inicializa automáticamente con tablas y datos de prueba.  
> Espera el mensaje: `🚀 ILPEA API corriendo en http://localhost:3000`

---

## 🔑 Credenciales por Defecto

| Rol       | Email                  | Contraseña     |
|-----------|------------------------|----------------|
| ADMIN     | admin@ilpea.com        | password       |
| MANAGER   | manager@ilpea.com      | password       |
| EMPLOYEE  | employee@ilpea.com     | password       |

---

## 📁 Estructura del Proyecto

```
ilpea-backend/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── .env.example
├── sql/
│   └── init.sql              ← Schema + datos iniciales
└── src/
    ├── index.js              ← Entry point
    ├── config/
    │   └── db.js             ← Pool de conexiones MySQL
    ├── middleware/
    │   └── auth.js           ← JWT + guardias de rol
    ├── utils/
    │   └── status.js         ← Lógica de cálculo de estado de ruta
    ├── controllers/
    │   ├── authController.js
    │   ├── employeeController.js
    │   ├── serviceController.js
    │   ├── assignmentController.js
    │   ├── userController.js
    │   ├── dashboardController.js
    │   ├── routeController.js
    │   └── stopController.js
    └── routes/
        └── index.js          ← Todas las rutas de la API
```

---

## 👥 Roles y Permisos

| Rol      | Descripción |
|----------|-------------|
| EMPLOYEE | Consulta su propia asignación (turno, ruta, parada, horario) |
| MANAGER  | Gestiona asignaciones y empleados. Monitorea rutas por turno |
| ADMIN    | Control total: rutas, paradas, vehículos, usuarios, dashboard |

---

## 📡 Endpoints

### Autenticación
```
POST /api/auth/login
```
**Body:** `{ "email": "...", "password": "..." }`  
**Response:** `{ "token": "...", "user": { ... } }`

Incluir el token en todas las peticiones:
```
Authorization: Bearer <token>
```

---

### Empleado

| Método | Ruta       | Descripción                          | Roles                       |
|--------|------------|--------------------------------------|-----------------------------|
| GET    | /api/me    | Perfil + asignación actual           | EMPLOYEE, MANAGER, ADMIN    |

---

### Servicios de Transporte

| Método | Ruta                          | Descripción                         | Roles              |
|--------|-------------------------------|-------------------------------------|--------------------|
| GET    | /api/services?shift_id=&date= | Servicios activos para turno/fecha  | MANAGER, ADMIN     |

---

### Asignaciones

| Método | Ruta                    | Descripción                       | Roles          |
|--------|-------------------------|-----------------------------------|----------------|
| POST   | /api/assignments        | Asignar empleado a servicio       | MANAGER, ADMIN |
| PUT    | /api/assignments/:id    | Reasignar empleado                | MANAGER, ADMIN |
| DELETE | /api/assignments/:id    | Eliminar asignación               | MANAGER, ADMIN |

---

### Usuarios

| Método | Ruta            | Descripción                                    | Roles          |
|--------|-----------------|------------------------------------------------|----------------|
| GET    | /api/users      | Listar usuarios (MANAGER ve solo EMPLOYEE)     | MANAGER, ADMIN |
| POST   | /api/users      | Crear usuario                                  | MANAGER, ADMIN |
| PUT    | /api/users/:id  | Modificar usuario                              | MANAGER, ADMIN |
| DELETE | /api/users/:id  | Eliminar usuario                               | MANAGER, ADMIN |

---

### Dashboard (ADMIN)

| Método | Ruta                              | Descripción                        |
|--------|-----------------------------------|------------------------------------|
| GET    | /api/dashboard/overview           | Métricas globales del sistema      |
| GET    | /api/dashboard/services?shift_id= | Detalle de servicios por turno     |

---

### Rutas (ADMIN)

| Método | Ruta                    | Descripción                        |
|--------|-------------------------|------------------------------------|
| GET    | /api/routes             | Listar rutas con paradas           |
| POST   | /api/routes             | Crear ruta                         |
| PUT    | /api/routes/:id         | Modificar ruta                     |
| PUT    | /api/routes/:id/status  | Activar / desactivar ruta          |

---

### Paradas (ADMIN)

| Método | Ruta                    | Descripción                        |
|--------|-------------------------|------------------------------------|
| POST   | /api/routes/:id/stops   | Agregar parada a ruta              |
| PUT    | /api/stops/:id          | Modificar parada                   |
| DELETE | /api/stops/:id          | Eliminar parada (sin asignaciones) |

---

## ⚙️ Lógica de Negocio

### Cálculo de Estado de Ruta

El estado se calcula **dinámicamente** en cada consulta (no se almacena en BD):

| Estado        | Condición                                    |
|---------------|----------------------------------------------|
| `LLENA`       | `current_load >= capacity`                   |
| `ACTIVA`      | `current_load >= min_required`               |
| `EN_PROGRESO` | `current_load >= ceil(min_required * 0.6)`   |
| `NO_VIABLE`   | `current_load < ceil(min_required * 0.6)`    |

### Aforo Mínimo

Calculado como el **40% de la capacidad** del vehículo, almacenado en `vehicle_types`:

| Vehículo | Capacidad | Mínimo (40%) |
|----------|-----------|--------------|
| Camión   | 30        | 12           |
| Sprinter | 19        | 8            |
| Van      | 12        | 5            |

---

## 🗄️ Variables de Entorno

Copiar `.env.example` a `.env` para desarrollo local sin Docker:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=ilpea_user
DB_PASSWORD=ilpea_pass
DB_NAME=ilpea_db
JWT_SECRET=linceHackatec2026_secret_key_ilpea
PORT=3000
```

---

## 🔒 Manejo de Errores

Todos los errores siguen el formato:
```json
{
  "error": "Descripción del error",
  "code": "ERROR_CODE",
  "status": 400
}
```

| HTTP | Código            | Causa                                        |
|------|-------------------|----------------------------------------------|
| 400  | VALIDATION_ERROR  | Campos requeridos faltantes o inválidos      |
| 401  | UNAUTHORIZED      | Token JWT ausente, inválido o expirado       |
| 403  | FORBIDDEN         | Rol sin permisos para esta operación         |
| 404  | NOT_FOUND         | Recurso no encontrado                        |
| 409  | CONFLICT          | Servicio lleno o email duplicado             |
| 500  | SERVER_ERROR      | Error interno del servidor                   |

---

## 🧪 Prueba Rápida

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ilpea.com","password":"password"}'

# 2. Dashboard overview (reemplaza <TOKEN>)
curl http://localhost:3000/api/dashboard/overview \
  -H "Authorization: Bearer <TOKEN>"

# 3. Servicios del turno 1 hoy
curl "http://localhost:3000/api/services?shift_id=1&date=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer <TOKEN>"
```
