/**
 * Middleware: Validazione Order Items
 * Valida structure e dati degli items dell'ordine
 * Previene dati malformati nel database
 */

const validateOrderItems = (req, res, next) => {
  console.log('🔍 [MIDDLEWARE] validateOrderItems - req.body:', req.body);
  console.log('🔍 [MIDDLEWARE] validateOrderItems - items:', req.body.items);
  console.log('🔍 [MIDDLEWARE] validateOrderItems - typeof items:', typeof req.body.items);
  console.log('🔍 [MIDDLEWARE] validateOrderItems - isArray:', Array.isArray(req.body.items));
  
  const { items } = req.body;

  // Check items è array
  if (!Array.isArray(items)) {
    console.log('❌ [MIDDLEWARE] items non è array');
    return res.status(400).json({
      success: false,
      error: 'items deve essere un array'
    });
  }

  // Check items non vuoto
  if (items.length === 0) {
    console.log('❌ [MIDDLEWARE] items array vuoto');
    return res.status(400).json({
      success: false,
      error: 'items non può essere vuoto - almeno 1 item richiesto'
    });
  }

  console.log('🔍 [MIDDLEWARE] items array valido, length:', items.length);

  // Valida ogni singolo item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`🔍 [MIDDLEWARE] Validando item ${i}:`, item);

    // Validazione category_code (accetta anche "category" per retrocompatibilità)
    const categoryCode = item.category_code || item.category;
    if (!categoryCode || typeof categoryCode !== 'string') {
      console.log(`❌ [MIDDLEWARE] Item ${i}: category_code mancante o non valida`);
      return res.status(400).json({
        success: false,
        error: `Item ${i}: category_code mancante o non valida`
      });
    }

    if (categoryCode.trim().length === 0) {
      console.log(`❌ [MIDDLEWARE] Item ${i}: category_code vuota`);
      return res.status(400).json({
        success: false,
        error: `Item ${i}: category_code non può essere vuota`
      });
    }

    // Normalizza: assicura che category_code sia impostato
    item.category_code = categoryCode;

    // Validazione flavors (opzionale - molti prodotti non hanno gusti)
    if (item.flavors !== undefined && item.flavors !== null) {
      if (!Array.isArray(item.flavors)) {
        console.log(`❌ [MIDDLEWARE] Item ${i}: flavors non è array`);
        return res.status(400).json({
          success: false,
          error: `Item ${i}: flavors deve essere un array`
        });
      }

      // Check ogni flavor è stringa non vuota (solo se ci sono flavors)
      for (let j = 0; j < item.flavors.length; j++) {
        if (typeof item.flavors[j] !== 'string' || item.flavors[j].trim().length === 0) {
          console.log(`❌ [MIDDLEWARE] Item ${i}: flavor ${j} non valido`);
          return res.status(400).json({
            success: false,
            error: `Item ${i}: flavor ${j} deve essere stringa non vuota`
          });
        }
      }
    } else {
      // Se non ci sono flavors, inizializza come array vuoto
      item.flavors = [];
    }

    // Validazione unit_price (permette 0 per prodotti omaggio o generici a €0)
    if (typeof item.unit_price !== 'number') {
      console.log(`❌ [MIDDLEWARE] Item ${i}: unit_price non è numero, tipo: ${typeof item.unit_price}`);
      return res.status(400).json({
        success: false,
        error: `Item ${i}: unit_price deve essere un numero`
      });
    }

    if (item.unit_price < 0) {
      console.log(`❌ [MIDDLEWARE] Item ${i}: unit_price negativo`);
      return res.status(400).json({
        success: false,
        error: `Item ${i}: unit_price non può essere negativo`
      });
    }

    // Validazione quantity
    if (!Number.isInteger(item.quantity)) {
      console.log(`❌ [MIDDLEWARE] Item ${i}: quantity non è intero`);
      return res.status(400).json({
        success: false,
        error: `Item ${i}: quantity deve essere un numero intero`
      });
    }

    if (item.quantity < 1) {
      console.log(`❌ [MIDDLEWARE] Item ${i}: quantity < 1`);
      return res.status(400).json({
        success: false,
        error: `Item ${i}: quantity deve essere almeno 1`
      });
    }

    if (item.quantity > 99) {
      console.log(`❌ [MIDDLEWARE] Item ${i}: quantity > 99`);
      return res.status(400).json({
        success: false,
        error: `Item ${i}: quantity non può superare 99`
      });
    }

    // Validazione course (opzionale, ma se presente deve essere valido)
    if (item.course !== undefined && item.course !== null) {
      if (!Number.isInteger(item.course)) {
        console.log(`❌ [MIDDLEWARE] Item ${i}: course non è intero`);
        return res.status(400).json({
          success: false,
          error: `Item ${i}: course deve essere un numero intero`
        });
      }

      if (item.course < 1 || item.course > 5) {
        console.log(`❌ [MIDDLEWARE] Item ${i}: course fuori range`);
        return res.status(400).json({
          success: false,
          error: `Item ${i}: course deve essere tra 1 e 5`
        });
      }
    }

    // Validazione custom_note (opzionale, ma se presente deve essere stringa)
    if (item.custom_note !== undefined && item.custom_note !== null) {
      if (typeof item.custom_note !== 'string') {
        console.log(`❌ [MIDDLEWARE] Item ${i}: custom_note non è stringa`);
        return res.status(400).json({
          success: false,
          error: `Item ${i}: custom_note deve essere una stringa`
        });
      }

      if (item.custom_note.length > 500) {
        console.log(`❌ [MIDDLEWARE] Item ${i}: custom_note troppo lunga`);
        return res.status(400).json({
          success: false,
          error: `Item ${i}: custom_note non può superare 500 caratteri`
        });
      }
    }
    
    console.log(`✅ [MIDDLEWARE] Item ${i} validato con successo`);
  }

  console.log('✅ [MIDDLEWARE] Tutti gli items validati - passando al controller');
  // Validazione passata
  next();
};

module.exports = validateOrderItems;
