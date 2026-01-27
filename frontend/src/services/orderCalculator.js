/**
 * Servizio frontend per calcoli ordini
 * Mantiene consistenza con backend OrderCalculator
 */

class OrderCalculator {
  /**
   * Calcola totali ordine (stessa logica del backend)
   * @param {Array} items - Items dell'ordine
   * @param {number} covers - Numero coperti
   * @param {boolean} isAsporto - Se è asporto (no coperto)
   * @returns {Object} {subtotal, coverCharge, total}
   */
  static calculateTotals(items = [], covers = 0, isAsporto = false) {
    // Calcola subtotal dai items
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = (item.unitPrice + (item.supplementsTotal || 0)) * item.quantity;
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
    const supplementsTotal = item.supplementsTotal || 0;
    return (item.unitPrice + supplementsTotal) * item.quantity;
  }
}

export default OrderCalculator;
