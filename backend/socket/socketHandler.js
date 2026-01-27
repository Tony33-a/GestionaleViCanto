/**
 * Socket.IO Event Handler
 * Gestisce connessioni real-time per sincronizzazione tra:
 * - Monitor touch (postazione fissa)
 * - Tablet camerieri
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { initializeEventBatcher } = require('./events');

module.exports = (io) => {
  // Inizializza l'event batcher
  initializeEventBatcher(io);
  // Middleware per autenticazione Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, jwtConfig.secret);
      socket.user = decoded; // Attach user info to socket
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  // Gestione connessioni
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id} (User: ${socket.user.username})`);

    // Join client to appropriate room based on client type
    socket.on('join:room', (room) => {
      const validRooms = ['monitor', 'tablets'];

      if (!validRooms.includes(room)) {
        socket.emit('error', { message: 'Invalid room name' });
        return;
      }

      socket.join(room);
      console.log(`📱 ${socket.user.username} joined room: ${room}`);

      // Confirm room join
      socket.emit('room:joined', { room, user: socket.user.username });
    });

    // Leave room
    socket.on('leave:room', (room) => {
      socket.leave(room);
      console.log(`👋 ${socket.user.username} left room: ${room}`);
    });

    // Heartbeat/ping (per mantenere connessione attiva)
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Disconnessione
    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} (${socket.user.username}) - Reason: ${reason}`);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`🔴 Socket error for ${socket.id}:`, error);
    });
  });

  console.log('🔌 Socket.IO handler configured');
};
