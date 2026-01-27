-- ============================================
-- VICANTO - Dati Ufficiali Produzione
-- Eseguire con: psql -U vicanto -d vicanto -f seed_official_data.sql
-- ============================================

-- =========================
-- PULIZIA TABELLE
-- =========================
TRUNCATE TABLE products RESTART IDENTITY CASCADE;
TRUNCATE TABLE flavors RESTART IDENTITY CASCADE;
TRUNCATE TABLE supplements RESTART IDENTITY CASCADE;
TRUNCATE TABLE menu_categories RESTART IDENTITY CASCADE;


-- =========================
-- CATEGORIE
-- =========================
INSERT INTO menu_categories (code, name, icon, display_order, is_active) VALUES
  ('CAT_CONI', 'Coni', NULL, 1, TRUE),
  ('CAT_BEVANDE', 'Bevande', NULL, 2, TRUE),
  ('CAT_COPPETTE', 'Coppette', NULL, 3, TRUE),
  ('CAT_CREPES', 'Crepes', NULL, 4, TRUE),
  ('CAT_PANCAKE', 'Pancake', NULL, 5, TRUE),
  ('CAT_WAFFLES', 'Waffles', NULL, 6, TRUE),
  ('CAT_ALTRO', 'Altro', NULL, 7, TRUE);


-- =========================
-- PRODOTTI - CONI
-- =========================
INSERT INTO products (code, name, category_code, price, has_flavors, display_order, is_available) VALUES
  ('CONO_STD', 'Cono', 'CAT_CONI', 3.00, TRUE, 1, TRUE),
  ('CONO_PICCOLO', 'Cono piccolo', 'CAT_CONI', 2.50, TRUE, 2, TRUE),
  ('CONO_CIALDA_GRANDE', 'Cono cialda grande', 'CAT_CONI', 4.00, TRUE, 3, TRUE),
  ('CONO_CIALDA_PICCOLO', 'Cono cialda piccolo', 'CAT_CONI', 3.00, TRUE, 4, TRUE);


-- =========================
-- PRODOTTI - BEVANDE
-- =========================
INSERT INTO products (code, name, category_code, price, has_flavors, display_order, is_available) VALUES
  ('CAFFE', 'Caffe', 'CAT_BEVANDE', 1.00, FALSE, 1, TRUE),
  ('CAFFE_PANNA', 'Caffe con panna', 'CAT_BEVANDE', 1.50, FALSE, 2, TRUE),
  ('CAFFE_MACCHIATO', 'Caffe macchiato', 'CAT_BEVANDE', 1.50, FALSE, 3, TRUE),
  ('CAPPUCCINO', 'Cappuccino', 'CAT_BEVANDE', 1.50, FALSE, 4, TRUE),
  ('CREMINO_CAFFE', 'Cremino caffe', 'CAT_BEVANDE', 3.00, FALSE, 5, TRUE),
  ('CAFFE_DECA', 'Caffe decaffeinato', 'CAT_BEVANDE', NULL, FALSE, 6, TRUE),
  ('ACQUA_PICCOLA', 'Acqua piccola', 'CAT_BEVANDE', 1.00, FALSE, 7, TRUE),
  ('ACQUA_GRANDE', 'Acqua grande', 'CAT_BEVANDE', 2.00, FALSE, 8, TRUE),
  ('COCA_COLA', 'Coca Cola', 'CAT_BEVANDE', 2.50, FALSE, 9, TRUE),
  ('ESTATHE', 'Estathe', 'CAT_BEVANDE', 2.50, FALSE, 10, TRUE),
  ('THE_GRANITA', 'The e granita', 'CAT_BEVANDE', 4.00, FALSE, 11, TRUE),
  ('ACQUA_TONICA', 'Acqua tonica', 'CAT_BEVANDE', 2.50, FALSE, 12, TRUE),
  ('BECKS', 'Becks', 'CAT_BEVANDE', 2.50, FALSE, 13, TRUE),
  ('PATATINE', 'Patatine', 'CAT_BEVANDE', 1.00, FALSE, 14, TRUE);


-- =========================
-- PRODOTTI - COPPETTE
-- =========================
INSERT INTO products (code, name, category_code, price, has_flavors, display_order, is_available) VALUES
  ('COPPETTA_PICCOLA', 'Coppetta piccola', 'CAT_COPPETTE', 2.50, TRUE, 1, TRUE),
  ('COPPETTA_MEDIA', 'Coppetta media', 'CAT_COPPETTE', 3.00, TRUE, 2, TRUE),
  ('COPPETTA_GRANDE', 'Coppetta grande', 'CAT_COPPETTE', 3.50, TRUE, 3, TRUE);


-- =========================
-- PRODOTTI - CREPES
-- =========================
INSERT INTO products (code, name, category_code, price, has_flavors, display_order, is_available) VALUES
  ('CREPES_GELATO', 'Crepes gelato', 'CAT_CREPES', 5.50, TRUE, 1, TRUE),
  ('CREPES_NUTELLA', 'Crepes Nutella', 'CAT_CREPES', 3.50, FALSE, 2, TRUE),
  ('CREPES_PISTACCHIO', 'Crepes Nutella di pistacchio', 'CAT_CREPES', 4.00, FALSE, 3, TRUE),
  ('CREPES_BIANCA', 'Crepes Nutella bianca', 'CAT_CREPES', 3.50, FALSE, 4, TRUE),
  ('CREPES_BASE', 'Crepes', 'CAT_CREPES', NULL, FALSE, 5, TRUE);


-- =========================
-- PRODOTTI - PANCAKE
-- =========================
INSERT INTO products (code, name, category_code, price, has_flavors, display_order, is_available) VALUES
  ('PANCAKE_GELATO', 'Pancake gelato', 'CAT_PANCAKE', 5.50, TRUE, 1, TRUE),
  ('PANCAKE_NUTELLA', 'Pancake Nutella', 'CAT_PANCAKE', 3.50, FALSE, 2, TRUE),
  ('PANCAKE_PISTACCHIO', 'Pancake Nutella di pistacchio', 'CAT_PANCAKE', 4.00, FALSE, 3, TRUE),
  ('PANCAKE_BIANCA', 'Pancake Nutella bianca', 'CAT_PANCAKE', 3.50, FALSE, 4, TRUE),
  ('PANCAKE_BASE', 'Pancake', 'CAT_PANCAKE', NULL, FALSE, 5, TRUE);


-- =========================
-- PRODOTTI - WAFFLES
-- =========================
INSERT INTO products (code, name, category_code, price, has_flavors, display_order, is_available) VALUES
  ('WAFFLE_GELATO', 'Waffle gelato', 'CAT_WAFFLES', 5.50, TRUE, 1, TRUE),
  ('WAFFLE_NUTELLA', 'Waffle Nutella', 'CAT_WAFFLES', 3.50, FALSE, 2, TRUE),
  ('WAFFLE_PISTACCHIO', 'Waffle Nutella di pistacchio', 'CAT_WAFFLES', 4.00, FALSE, 3, TRUE),
  ('WAFFLE_BIANCA', 'Waffle Nutella bianca', 'CAT_WAFFLES', 3.50, FALSE, 4, TRUE),
  ('WAFFLE_BASE', 'Waffle', 'CAT_WAFFLES', NULL, FALSE, 5, TRUE);


-- =========================
-- PRODOTTI - ALTRO
-- =========================
INSERT INTO products (code, name, category_code, price, has_flavors, display_order, is_available) VALUES
  ('BRIOCHE', 'Brioche', 'CAT_ALTRO', 4.00, TRUE, 1, TRUE),
  ('FRAPPE', 'Frappe', 'CAT_ALTRO', 3.00, TRUE, 2, TRUE),
  ('FRAPPE_CROSTA', 'Frappe con crosta', 'CAT_ALTRO', 3.50, TRUE, 3, TRUE),
  ('YOGURT', 'Yogurt', 'CAT_ALTRO', 3.50, FALSE, 4, TRUE),
  ('YOGURT_FRUTTA', 'Yogurt con frutta', 'CAT_ALTRO', 4.50, FALSE, 5, TRUE),
  ('CHURROS_5', 'Churros 5 pezzi', 'CAT_ALTRO', 4.50, FALSE, 6, TRUE),
  ('BANANA_SPLIT', 'Banana split', 'CAT_ALTRO', 5.00, TRUE, 7, TRUE),
  ('CANNOLO_SCOMP', 'Cannolo scomposto', 'CAT_ALTRO', 4.00, FALSE, 8, TRUE),
  ('SPONGATO_VETRO', 'Spongato in vetro', 'CAT_ALTRO', 4.00, FALSE, 9, TRUE),
  ('SPONGATO_FRUTTA', 'Spongato con frutta e gelato', 'CAT_ALTRO', 5.50, TRUE, 10, TRUE),
  ('FRUTTA_STAGIONE', 'Frutta di stagione', 'CAT_ALTRO', 3.00, FALSE, 11, TRUE),
  ('AFFOGATO', 'Affogato al caffe', 'CAT_ALTRO', 4.50, FALSE, 12, TRUE),
  ('SPAGHETTI_ICE', 'Spaghetti ice', 'CAT_ALTRO', 5.00, TRUE, 13, TRUE),
  ('TIRAMISU', 'Tiramisu', 'CAT_ALTRO', 4.50, FALSE, 14, TRUE),
  ('POKE', 'Poke', 'CAT_ALTRO', 10.50, FALSE, 15, TRUE),
  ('SGROPPINO', 'Sgroppino', 'CAT_ALTRO', 3.50, FALSE, 16, TRUE);


-- =========================
-- GUSTI (per tutte le categorie con gusti)
-- =========================
INSERT INTO flavors (name, category_code, display_order, is_available) VALUES
  -- Gusti per CONI
  ('Lotus', 'CAT_CONI', 1, TRUE),
  ('Zuppa inglese', 'CAT_CONI', 2, TRUE),
  ('Amarena', 'CAT_CONI', 3, TRUE),
  ('Pistacchio', 'CAT_CONI', 4, TRUE),
  ('Nocciola', 'CAT_CONI', 5, TRUE),
  ('Cookies', 'CAT_CONI', 6, TRUE),
  ('Fragola', 'CAT_CONI', 7, TRUE),
  ('Fior di latte', 'CAT_CONI', 8, TRUE),
  ('Cioccolato', 'CAT_CONI', 9, TRUE),
  ('Granita limone', 'CAT_CONI', 10, TRUE),

  -- Gusti per COPPETTE
  ('Lotus', 'CAT_COPPETTE', 1, TRUE),
  ('Zuppa inglese', 'CAT_COPPETTE', 2, TRUE),
  ('Amarena', 'CAT_COPPETTE', 3, TRUE),
  ('Pistacchio', 'CAT_COPPETTE', 4, TRUE),
  ('Nocciola', 'CAT_COPPETTE', 5, TRUE),
  ('Cookies', 'CAT_COPPETTE', 6, TRUE),
  ('Fragola', 'CAT_COPPETTE', 7, TRUE),
  ('Fior di latte', 'CAT_COPPETTE', 8, TRUE),
  ('Cioccolato', 'CAT_COPPETTE', 9, TRUE),
  ('Granita limone', 'CAT_COPPETTE', 10, TRUE),

  -- Gusti per CREPES (solo gelato)
  ('Lotus', 'CAT_CREPES', 1, TRUE),
  ('Zuppa inglese', 'CAT_CREPES', 2, TRUE),
  ('Amarena', 'CAT_CREPES', 3, TRUE),
  ('Pistacchio', 'CAT_CREPES', 4, TRUE),
  ('Nocciola', 'CAT_CREPES', 5, TRUE),
  ('Cookies', 'CAT_CREPES', 6, TRUE),
  ('Fragola', 'CAT_CREPES', 7, TRUE),
  ('Fior di latte', 'CAT_CREPES', 8, TRUE),
  ('Cioccolato', 'CAT_CREPES', 9, TRUE),
  ('Granita limone', 'CAT_CREPES', 10, TRUE),

  -- Gusti per PANCAKE (solo gelato)
  ('Lotus', 'CAT_PANCAKE', 1, TRUE),
  ('Zuppa inglese', 'CAT_PANCAKE', 2, TRUE),
  ('Amarena', 'CAT_PANCAKE', 3, TRUE),
  ('Pistacchio', 'CAT_PANCAKE', 4, TRUE),
  ('Nocciola', 'CAT_PANCAKE', 5, TRUE),
  ('Cookies', 'CAT_PANCAKE', 6, TRUE),
  ('Fragola', 'CAT_PANCAKE', 7, TRUE),
  ('Fior di latte', 'CAT_PANCAKE', 8, TRUE),
  ('Cioccolato', 'CAT_PANCAKE', 9, TRUE),
  ('Granita limone', 'CAT_PANCAKE', 10, TRUE),

  -- Gusti per WAFFLES (solo gelato)
  ('Lotus', 'CAT_WAFFLES', 1, TRUE),
  ('Zuppa inglese', 'CAT_WAFFLES', 2, TRUE),
  ('Amarena', 'CAT_WAFFLES', 3, TRUE),
  ('Pistacchio', 'CAT_WAFFLES', 4, TRUE),
  ('Nocciola', 'CAT_WAFFLES', 5, TRUE),
  ('Cookies', 'CAT_WAFFLES', 6, TRUE),
  ('Fragola', 'CAT_WAFFLES', 7, TRUE),
  ('Fior di latte', 'CAT_WAFFLES', 8, TRUE),
  ('Cioccolato', 'CAT_WAFFLES', 9, TRUE),
  ('Granita limone', 'CAT_WAFFLES', 10, TRUE),

  -- Gusti per ALTRO (brioche, frappe, banana split, etc.)
  ('Lotus', 'CAT_ALTRO', 1, TRUE),
  ('Zuppa inglese', 'CAT_ALTRO', 2, TRUE),
  ('Amarena', 'CAT_ALTRO', 3, TRUE),
  ('Pistacchio', 'CAT_ALTRO', 4, TRUE),
  ('Nocciola', 'CAT_ALTRO', 5, TRUE),
  ('Cookies', 'CAT_ALTRO', 6, TRUE),
  ('Fragola', 'CAT_ALTRO', 7, TRUE),
  ('Fior di latte', 'CAT_ALTRO', 8, TRUE),
  ('Cioccolato', 'CAT_ALTRO', 9, TRUE),
  ('Granita limone', 'CAT_ALTRO', 10, TRUE);


-- =========================
-- SUPPLEMENTI
-- =========================
INSERT INTO supplements (name, code, price, display_order, is_available) VALUES
  ('Topping fragola', 'topping_fragola', 0.50, 1, TRUE),
  ('Topping amarena', 'topping_amarena', 0.50, 2, TRUE),
  ('Topping caramello', 'topping_caramello', 0.50, 3, TRUE),
  ('Granella nocciola', 'granella_nocciola', 0.50, 4, TRUE),
  ('Palline cioccolato bianco', 'palline_cioccolato_bianco', 0.50, 5, TRUE),
  ('Palline cioccolato fondente', 'palline_cioccolato_fondente', 0.50, 6, TRUE),
  ('Panna', 'panna', 0.50, 7, TRUE);


-- =========================
-- VERIFICA
-- =========================
SELECT 'Categorie:' AS tipo, COUNT(*) AS totale FROM menu_categories
UNION ALL
SELECT 'Prodotti:', COUNT(*) FROM products
UNION ALL
SELECT 'Gusti:', COUNT(*) FROM flavors
UNION ALL
SELECT 'Supplementi:', COUNT(*) FROM supplements;
