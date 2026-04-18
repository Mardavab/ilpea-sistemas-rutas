-- ============================================================
-- LinceHackatec 2026 | ILPEA | Schema + Optimized Data
-- ============================================================

CREATE DATABASE IF NOT EXISTS ilpea_db;
USE ilpea_db;

-- ---- vehicle_types ----------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_types (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(50)  NOT NULL,
  capacity     INT          NOT NULL,
  min_required INT          NOT NULL COMMENT '40% of capacity'
);

INSERT INTO vehicle_types (name, capacity, min_required) VALUES
  ('Camion',       30, 12),
  ('Sprinter',     19,  8),
  ('Van',          12,  5),
  ('Auto/MiniVan',  4,  2);

-- ---- employees --------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('EMPLOYEE','MANAGER','ADMIN') NOT NULL DEFAULT 'EMPLOYEE'
);

INSERT INTO employees (name, email, password_hash, role) VALUES
  ('Administrador ILPEA', 'admin@ilpea.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN'),
  ('Encargado Operaciones', 'manager@ilpea.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'MANAGER'),
  ('Juan Perez', 'employee@ilpea.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'EMPLOYEE');

-- ---- shifts -----------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(50) NOT NULL,
  start_time TIME        NOT NULL,
  end_time   TIME        NOT NULL
);

-- Optimized: No Mixed, no Saturday 3rd, no Sunday. Only Turnos 1, 2, 3.
INSERT INTO shifts (name, start_time, end_time) VALUES
  ('Turno 1', '06:00:00', '14:00:00'),
  ('Turno 2', '14:00:00', '22:00:00'),
  ('Turno 3', '22:00:00', '06:00:00');

-- ---- routes -----------------------------------------------
CREATE TABLE IF NOT EXISTS routes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  vehicle_type_id INT          NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_route_vehicle FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
);

-- Optimized: Unified Route 3/4, Deleted 6 and 14.
INSERT INTO routes (id, name, vehicle_type_id, is_active) VALUES
  (1, 'Ruta 01 - Apaseo el Grande',   1, TRUE),
  (2, 'Ruta 02 - Rancheras',          1, TRUE),
  (3, 'Ruta 03 - Queretaro (Unificada)', 1, TRUE),
  (5, 'Ruta 05 - Fuentes de Balvanera', 2, TRUE),
  (7, 'Ruta 07 - Celaya 1',           4, TRUE), -- Recommendation: 4p vehicle
  (8, 'Ruta 08 - Santa Rita',         4, TRUE), -- Recommendation: 4p vehicle
  (9, 'Ruta 09 - Apaseo el Alto',     1, TRUE);

-- ---- stops ------------------------------------------------
CREATE TABLE IF NOT EXISTS stops (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  route_id    INT          NOT NULL,
  name        VARCHAR(100) NOT NULL,
  order_index INT          NOT NULL,
  CONSTRAINT fk_stop_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);

INSERT INTO stops (route_id, name, order_index) VALUES
  (1, 'Parada 1 - Centro Apaseo',    1),
  (1, 'Parada 2 - Zona Industrial',  2),
  (1, 'Parada 3 - ILPEA Planta',     3),
  (2, 'Parada 1 - Rancheras Norte',  1),
  (2, 'Parada 2 - Libramiento',      2),
  (3, 'Parada 1 - Queretaro Centro', 1),
  (3, 'Parada 2 - Col. Obrera',      2),
  (3, 'Parada 3 - Carrillo Puerto',  3),
  (3, 'Parada 4 - Periférico',       4),
  (5, 'Parada 1 - Fuentes',          1),
  (9, 'Parada 1 - Apaseo el Alto',   1);

-- ---- transport_services -----------------------------------
CREATE TABLE IF NOT EXISTS transport_services (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  route_id     INT  NOT NULL,
  shift_id     INT  NOT NULL,
  date         DATE NOT NULL,
  current_load INT  NOT NULL DEFAULT 0,
  CONSTRAINT fk_svc_route  FOREIGN KEY (route_id)  REFERENCES routes(id),
  CONSTRAINT fk_svc_shift  FOREIGN KEY (shift_id)  REFERENCES shifts(id)
);

-- ---- assignments ------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  service_id  INT NOT NULL,
  stop_id     INT NOT NULL,
  CONSTRAINT fk_asgn_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_asgn_service  FOREIGN KEY (service_id)  REFERENCES transport_services(id) ON DELETE CASCADE,
  CONSTRAINT fk_asgn_stop     FOREIGN KEY (stop_id)     REFERENCES stops(id)
);
