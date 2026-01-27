/**
 * Socket.IO Event Batcher
 * Raggruppa eventi correlati per evitare re-render multipli
 */

class EventBatcher {
  constructor(io) {
    this.io = io;
    this.pendingEvents = new Map(); // eventId -> { events, timeout }
    this.BATCH_DELAY = 50; // 50ms per raggruppare eventi
  }

  /**
   * Aggiunge evento al batch
   * @param {string} batchId - ID univoco per raggruppare eventi (es: "order-123")
   * @param {string} event - Nome evento
   * @param {string} room - Room target
   * @param {Object} data - Dati evento
   */
  addEvent(batchId, event, room, data) {
    if (!this.pendingEvents.has(batchId)) {
      this.pendingEvents.set(batchId, {
        events: [],
        timeout: setTimeout(() => {
          this.flushBatch(batchId);
        }, this.BATCH_DELAY)
      });
    }

    const batch = this.pendingEvents.get(batchId);
    batch.events.push({ event, room, data });
  }

  /**
   * Emette tutti gli eventi nel batch
   * @param {string} batchId - ID batch da flushare
   */
  flushBatch(batchId) {
    const batch = this.pendingEvents.get(batchId);
    if (!batch) return;

    const { events } = batch;
    
    // Raggruppa eventi per room per ottimizzare
    const eventsByRoom = new Map();
    events.forEach(({ event, room, data }) => {
      if (!eventsByRoom.has(room)) {
        eventsByRoom.set(room, []);
      }
      eventsByRoom.get(room).push({ event, data });
    });

    // Emetti eventi per ogni room
    eventsByRoom.forEach((roomEvents, room) => {
      roomEvents.forEach(({ event, data }) => {
        this.io.to(room).emit(event, data);
        console.log(`📤 Batched event emitted: ${event} to room: ${room}`);
      });
    });

    // Pulisci batch
    clearTimeout(batch.timeout);
    this.pendingEvents.delete(batchId);
  }

  /**
   * Emette immediatamente senza batching (per eventi critici)
   * @param {string} event - Nome evento
   * @param {string} room - Room target
   * @param {Object} data - Dati evento
   */
  emitImmediate(event, room, data) {
    this.io.to(room).emit(event, data);
    console.log(`📤 Immediate event emitted: ${event} to room: ${room}`);
  }

  /**
   * Pulisce tutti i batch pending (per cleanup)
   */
  flushAll() {
    this.pendingEvents.forEach((_, batchId) => {
      this.flushBatch(batchId);
    });
  }
}

module.exports = EventBatcher;
