const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'linceHackatec2026_secret_key_ilpea';

/**
 * Verifies the Bearer JWT and attaches `req.user`.
 */
function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido', code: 'UNAUTHORIZED', status: 401 });
  }

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado', code: 'UNAUTHORIZED', status: 401 });
  }
}

/**
 * Restricts access to specific roles.
 * @param  {...string} roles - Allowed roles, e.g. 'ADMIN', 'MANAGER'
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Acceso no permitido para este rol', code: 'FORBIDDEN', status: 403 });
    }
    next();
  };
}

module.exports = { authenticate, authorize, JWT_SECRET };
