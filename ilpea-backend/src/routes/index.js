const express = require('express');
const router  = express.Router();

const { authenticate, authorize } = require('../middleware/auth');

const authCtrl       = require('../controllers/authController');
const employeeCtrl   = require('../controllers/employeeController');
const serviceCtrl    = require('../controllers/serviceController');
const assignmentCtrl = require('../controllers/assignmentController');
const userCtrl       = require('../controllers/userController');
const dashboardCtrl  = require('../controllers/dashboardController');
const routeCtrl      = require('../controllers/routeController');
const stopCtrl       = require('../controllers/stopController');
const shiftCtrl      = require('../controllers/shiftController');
const reportCtrl     = require('../controllers/reportController');

// ── Auth ──────────────────────────────────────────────────────────────
router.post('/auth/login', authCtrl.login);

// ── Common / Metadata ─────────────────────────────────────────────────
router.get('/shifts', authenticate, shiftCtrl.listShifts);

// ── Employee ──────────────────────────────────────────────────────────
router.get('/me', authenticate, employeeCtrl.getMe);

// ── Services (MANAGER+) ───────────────────────────────────────────────
router.get('/services', authenticate, authorize('MANAGER', 'ADMIN'), serviceCtrl.getServices);
router.post('/services', authenticate, authorize('MANAGER', 'ADMIN'), serviceCtrl.createService);

// ── Reports (ADMIN) ───────────────────────────────────────────────────
router.get('/reports/historical-usage', authenticate, authorize('ADMIN'), reportCtrl.getHistoricalUsageData);

// ── Assignments (MANAGER+) ────────────────────────────────────────────
// NUEVO: GET para listar asignaciones con nombres reales (no IDs)
router.get   ('/assignments',     authenticate, authorize('MANAGER', 'ADMIN'), assignmentCtrl.listAssignments);
router.post  ('/assignments',     authenticate, authorize('MANAGER', 'ADMIN'), assignmentCtrl.createAssignment);
router.put   ('/assignments/:id', authenticate, authorize('MANAGER', 'ADMIN'), assignmentCtrl.updateAssignment);
router.delete('/assignments/:id', authenticate, authorize('MANAGER', 'ADMIN'), assignmentCtrl.deleteAssignment);
router.get   ('/services/:service_id/occupied-seats', authenticate, authorize('MANAGER', 'ADMIN'), assignmentCtrl.getOccupiedSeats);

// ── Users (MANAGER+ with role restrictions enforced in controller) ─────
router.get   ('/users',     authenticate, authorize('MANAGER', 'ADMIN'), userCtrl.listUsers);
router.post  ('/users',     authenticate, authorize('MANAGER', 'ADMIN'), userCtrl.createUser);
router.put   ('/users/:id', authenticate, authorize('MANAGER', 'ADMIN'), userCtrl.updateUser);
router.delete('/users/:id', authenticate, authorize('MANAGER', 'ADMIN'), userCtrl.deleteUser);

// ── Dashboard (ADMIN) ─────────────────────────────────────────────────
router.get('/dashboard/overview',  authenticate, authorize('ADMIN'), dashboardCtrl.getOverview);
router.get('/dashboard/services',  authenticate, authorize('ADMIN'), dashboardCtrl.getDashboardServices);

// ── Routes management (ADMIN) ─────────────────────────────────────────
router.get   ('/routes',            authenticate, authorize('ADMIN'), routeCtrl.listRoutes);
router.post  ('/routes',            authenticate, authorize('ADMIN'), routeCtrl.createRoute);
router.put   ('/routes/:id',        authenticate, authorize('ADMIN'), routeCtrl.updateRoute);
router.put   ('/routes/:id/status', authenticate, authorize('ADMIN'), routeCtrl.updateRouteStatus);

// ── Stops management (ADMIN) ──────────────────────────────────────────
router.post  ('/routes/:id/stops', authenticate, authorize('ADMIN'), stopCtrl.addStop);
router.put   ('/stops/:id',        authenticate, authorize('ADMIN'), stopCtrl.updateStop);
router.delete('/stops/:id',        authenticate, authorize('ADMIN'), stopCtrl.deleteStop);

module.exports = router;