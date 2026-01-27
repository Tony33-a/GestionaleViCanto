/**
 * Middleware: Autenticazione JWT
 * Verifica token e attacca user a req
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Verifica JWT token
 */
const authenticate = (req, res, next) => {
  try {
    console.log('🔍 [AUTH] authenticate - headers:', req.headers);
    console.log('🔍 [AUTH] authenticate - authorization header:', req.headers.authorization);
    
    // Estrai token dall'header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('❌ [AUTH] Nessun auth header');
      return res.status(401).json({
        success: false,
        error: 'Token non fornito'
      });
    }

    console.log('🔍 [AUTH] Auth header trovato:', authHeader);

    // Format: "Bearer <token>"
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    console.log('🔍 [AUTH] Token estratto:', token.substring(0, 20) + '...');

    // Verifica token
    const decoded = jwt.verify(token, jwtConfig.secret);
    console.log('🔍 [AUTH] Token verificato, user:', decoded);

    // Attacca user a request
    req.user = decoded;

    console.log('✅ [AUTH] Autenticazione completata - passando al middleware successivo');
    next();
  } catch (error) {
    console.log('❌ [AUTH] Errore autenticazione:', error.name, error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token scaduto'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token non valido'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Errore autenticazione'
    });
  }
};

/**
 * Verifica ruolo admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Permessi insufficienti'
    });
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin
};
