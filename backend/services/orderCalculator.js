/**
 * Servizio centralizzato per calcoli ordini
 * Evita duplicazione logica tra frontend e backend
 */

class OrderCalculator {
  /**
   * Calcola totali ordine
   * @param {Array} items - Items dell'ordine
   * @param {number} covers - Numero coperti
   * @param {boolean} isAsporto - Se è asporto (no coperto)
   * @returns {Object} {subtotal, coverCharge, total}
   */
  static calculateTotals(items = [], covers = 0, isAsporto = false) {
    // Calcola subtotal dai items
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = (item.unit_price + (item.supplements_total || 0)) * item.quantity;
      return sum + itemTotal;
    }, 0);

    // Calcola coperto (€0.20 per coperto) - solo se non è asporto
    const coverCharge = isAsporto ? 0 : covers * 0.20;

    // Totale
    const total = subtotal + coverCharge;

    return {
      subtotal: Math.round(subtotal * 100) / 100, // Arrotonda a 2 decimali
      coverCharge: Math.round(coverCharge * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Calcola totale per singolo item
   * @param {Object} item - Item dell'ordine
   * @returns {number} Item total
   */
  static calculateItemTotal(item) {
    const supplementsTotal = item.supplements_total || 0;
    return (item.unit_price + supplementsTotal) * item.quantity;
  }

  /**
   * Calcola subtotal per items (senza coperto)
   * @param {Array} items - Items dell'ordine
   * @returns {number} Subtotal
   */
  static calculateSubtotal(items = []) {
    return items.reduce((sum, item) => {
      return sum + this.calculateItemTotal(item);
    }, 0);
  }

  /**
   * Calcola coperto
   * @param {number} covers - Numero coperti
   * @param {boolean} isAsporto - Se è asporto
   * @returns {number} Cover charge
   */
  static calculateCoverCharge(covers = 0, isAsporto = false) {
    return isAsporto ? 0 : covers * 0.20;
  }
}

module.exports = OrderCalculator;
