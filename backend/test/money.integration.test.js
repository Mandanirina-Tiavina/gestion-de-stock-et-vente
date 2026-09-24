import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/server.js';
import pool from '../src/config/database.js';

// ---------------------------------------------------------------------------
// Tests d'intégration : intégrité des calculs d'argent (revenus / dépenses)
// Chaque run crée une boutique de test isolée, puis la supprime (cascade).
// ---------------------------------------------------------------------------

const BASE = '/api';
let server;
let baseURL;
let token;
let shopId;

const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const shopName = `test-shop-${suffix}`;
const username = `admin${suffix}`;
const email = `test-${suffix}@example.com`;
const PASSWORD = 'testpass123';

const api = async (method, path, { body, token: tk } = {}) => {
  const res = await fetch(`${baseURL}${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tk ? { Authorization: `Bearer ${tk}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
};

const createProduct = async (product) => {
  const res = await api('POST', '/products', { body: product, token });
  return res;
};

const createOrder = async (items, extra = {}) => {
  const res = await api('POST', '/orders', {
    body: {
      customer_name: 'Client Test',
      customer_phone: '0320000000',
      delivery_address: 'Antananarivo',
      customer_email: '',
      delivery_date: new Date().toISOString(),
      items,
      ...extra
    },
    token
  });
  return res;
};

const setStatus = async (orderId, body) =>
  api('PATCH', `/orders/${orderId}/status`, { body, token });

const getProduct = async (id) => {
  const res = await api('GET', `/products/${id}`, { token });
  return res.data;
};

const getSales = async () => {
  const res = await api('GET', '/sales', { token });
  return res.data;
};

const getSummary = async () => {
  const res = await api('GET', '/accounting/summary', { token });
  return res.data;
};

const getStats = async () => {
  const res = await api('GET', '/sales/stats', { token });
  return res.data;
};

const round2 = (n) => Math.round(n * 100) / 100;

describe('Intégrité des calculs d\'argent', () => {
  before(async () => {
    // Nettoyage des éventuelles boutiques de test résiduelles
    await pool.query(`DELETE FROM shops WHERE name LIKE 'test-shop-%'`);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseURL = `http://127.0.0.1:${server.address().port}`;

    const res = await api('POST', '/auth/register', {
      body: { shopName, username, email, password: PASSWORD }
    });
    assert.equal(res.status, 201, `Register échoué: ${JSON.stringify(res.data)}`);
    token = res.data.token;
    shopId = res.data.user.shop_id;
  });

  after(async () => {
    await pool.query('DELETE FROM shops WHERE id = $1', [shopId]);
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  // ----------------------------------------------------------------------
  // Cycle complet : commande -> total -> vente -> comptabilité / ventes
  // ----------------------------------------------------------------------

  describe('Calcul du total d\'une commande', () => {
    it('total_amount = prix par défaut du produit x quantité', async () => {
      const p = await createProduct({ name: `p-def-${suffix}`, price: 100, quantity: 10 });
      assert.equal(p.status, 201);
      const pid = p.data.product.id;

      const ord = await createOrder([{ product_id: pid, quantity: 2 }]);
      assert.equal(ord.status, 201);
      assert.equal(ord.data.order.total_amount, 200);
    });

    it('total_amount tient compte du custom_price positif', async () => {
      const p = await createProduct({ name: `p-custom-${suffix}`, price: 100, quantity: 10 });
      const pid = p.data.product.id;

      const ord = await createOrder([{ product_id: pid, quantity: 2, custom_price: 150 }]);
      assert.equal(ord.status, 201);
      assert.equal(ord.data.order.total_amount, 300);
    });

    it('total_amount = 0 quand custom_price = 0 (produit offert)', async () => {
      const p = await createProduct({ name: `p-free-${suffix}`, price: 100, quantity: 10 });
      const pid = p.data.product.id;

      const ord = await createOrder([{ product_id: pid, quantity: 2, custom_price: 0 }]);
      assert.equal(ord.status, 201);
      assert.equal(ord.data.order.total_amount, 0);
    });
  });

  describe('Vente : cohérence ventes / revenus comptables', () => {
    it('Σ ventes === revenu comptable quand le prix négocié diffère du total (répartition)', async () => {
      const prices = [30, 30, 30];
      const productIds = [];
      for (let i = 0; i < prices.length; i++) {
        const p = await createProduct({ name: `p-split-${suffix}-${i}`, price: prices[i], quantity: 10 });
        productIds.push(p.data.product.id);
      }

      const ord = await createOrder(productIds.map((product_id) => ({ product_id, quantity: 1 })));
      const orderId = ord.data.order.id;
      assert.equal(round2(ord.data.order.total_amount), 90);

      // 3 lignes égales -> 10.00 chacune ; vendu avec remise à 10 -> 3.33 x 3 = 9.99 (arrondi!)
      const sold = await setStatus(orderId, { status: 'vendu', final_price: 10 });
      assert.equal(sold.status, 200);

      const sales = await getSales();
      const sumSales = round2(sales.reduce((acc, s) => acc + Number(s.final_price), 0));
      const summary = await getSummary();
      assert.equal(sumSales, Number(summary.totalRevenus),
        `Σ ventes (${sumSales}) != revenus comptables (${summary.totalRevenus})`);
      assert.equal(round2(Number(summary.totalRevenus)), 10);
    });

    it('sales stats.total === totalRevenus comptables', async () => {
      const stats = await getStats();
      const summary = await getSummary();
      assert.equal(Number(stats.total), Number(summary.totalRevenus),
        `total ventes (${stats.total}) != total revenus (${summary.totalRevenus})`);
    });
  });

  describe('Transactions manuelles : rentrées et sorties', () => {
    it('solde = totalRevenus - totalDepenses', async () => {
      await api('POST', '/accounting/transactions', {
        body: { type: 'depense', category: 'Achat stock', amount: 1200, description: 'test' },
        token
      });
      await api('POST', '/accounting/transactions', {
        body: { type: 'revenu', category: 'Autre', amount: 500, description: 'test' },
        token
      });

      const summary = await getSummary();
      assert.equal(
        round2(Number(summary.solde)),
        round2(Number(summary.totalRevenus) - Number(summary.totalDepenses))
      );
    });

    it('une depense diminue le solde, un revenu l\'augmente', async () => {
      const beforeBal = Number((await getSummary()).solde);

      await api('POST', '/accounting/transactions', {
        body: { type: 'depense', category: 'Fournitures', amount: 1000 },
        token
      });
      const afterDepense = Number((await getSummary()).solde);
      assert.equal(round2(afterDepense), round2(beforeBal - 1000));

      await api('POST', '/accounting/transactions', {
        body: { type: 'revenu', category: 'Autre', amount: 2000 },
        token
      });
      const afterRevenu = Number((await getSummary()).solde);
      assert.equal(round2(afterRevenu), round2(afterDepense + 2000));
    });
  });

  describe('Non-double comptage', () => {
    it('marquer "vendu" deux fois ne double pas les ventes ni les revenus', async () => {
      const p = await createProduct({ name: `p-double-${suffix}`, price: 50, quantity: 5 });
      const pid = p.data.product.id;

      const ord = await createOrder([{ product_id: pid, quantity: 2 }]);
      const orderId = ord.data.order.id;

      const salesBefore = Number((await pool.query(
        'SELECT COUNT(*) AS c FROM sales WHERE shop_id = $1', [shopId])).rows[0].c);
      const revBefore = Number((await pool.query(
        `SELECT COUNT(*) AS c FROM transactions WHERE shop_id = $1 AND type = 'revenu'`, [shopId])).rows[0].c);

      await setStatus(orderId, { status: 'vendu', final_price: 90 });
      await setStatus(orderId, { status: 'vendu', final_price: 90 });

      const salesAfter = Number((await pool.query(
        'SELECT COUNT(*) AS c FROM sales WHERE shop_id = $1', [shopId])).rows[0].c);
      const revAfter = Number((await pool.query(
        `SELECT COUNT(*) AS c FROM transactions WHERE shop_id = $1 AND type = 'revenu'`, [shopId])).rows[0].c);

      assert.equal(salesAfter - salesBefore, 1);
      assert.equal(revAfter - revBefore, 1);
    });

    it('annuler deux fois ne restaure pas le stock deux fois', async () => {
      const p = await createProduct({ name: `p-annule-${suffix}`, price: 50, quantity: 10 });
      const pid = p.data.product.id;

      const ord = await createOrder([{ product_id: pid, quantity: 3 }]);
      const orderId = ord.data.order.id;
      assert.equal(Number((await getProduct(pid)).quantity), 7);

      await setStatus(orderId, { status: 'annule' });
      assert.equal(Number((await getProduct(pid)).quantity), 10);

      await setStatus(orderId, { status: 'annule' });
      assert.equal(Number((await getProduct(pid)).quantity), 10);
    });
  });

  describe('Stock et suppression', () => {
    it('supprimer une commande non vendue restaure le stock sans créer de vente', async () => {
      const p = await createProduct({ name: `p-del-${suffix}`, price: 40, quantity: 10 });
      const pid = p.data.product.id;

      const ord = await createOrder([{ product_id: pid, quantity: 4 }]);
      const orderId = ord.data.order.id;
      assert.equal(Number((await getProduct(pid)).quantity), 6);

      const salesBefore = Number((await pool.query(
        'SELECT COUNT(*) AS c FROM sales WHERE shop_id = $1', [shopId])).rows[0].c);
      const revBefore = Number((await pool.query(
        `SELECT COUNT(*) AS c FROM transactions WHERE shop_id = $1 AND type = 'revenu'`, [shopId])).rows[0].c);

      const del = await api('DELETE', `/orders/${orderId}`, { token });
      assert.equal(del.status, 200);
      assert.equal(Number((await getProduct(pid)).quantity), 10);

      const salesAfter = Number((await pool.query(
        'SELECT COUNT(*) AS c FROM sales WHERE shop_id = $1', [shopId])).rows[0].c);
      const revAfter = Number((await pool.query(
        `SELECT COUNT(*) AS c FROM transactions WHERE shop_id = $1 AND type = 'revenu'`, [shopId])).rows[0].c);

      assert.equal(salesAfter - salesBefore, 0);
      assert.equal(revAfter - revBefore, 0);
    });

    it('supprimer une commande vendue est refusé (l\'historique des ventes reste cohérent)', async () => {
      const p = await createProduct({ name: `p-delvendu-${suffix}`, price: 30, quantity: 5 });
      const pid = p.data.product.id;

      const ord = await createOrder([{ product_id: pid, quantity: 1 }]);
      const orderId = ord.data.order.id;
      await setStatus(orderId, { status: 'vendu', final_price: 30 });

      const del = await api('DELETE', `/orders/${orderId}`, { token });
      assert.equal(del.status, 400,
        'Supprimer une commande vendue doit être bloqué pour ne pas effacer les ventes/revenus enregistrés.');
    });
  });

  // ----------------------------------------------------------------------
  // Anti-argent-faux : validations des montants
  // ----------------------------------------------------------------------

  describe('Validations : montants et quantités', () => {
    it('refuser un produit au prix négatif', async () => {
      const res = await createProduct({ name: `p-neg-${suffix}`, price: -100, quantity: 5 });
      assert.equal(res.status, 400);
    });

    it('refuser un produit à quantité négative', async () => {
      const res = await createProduct({ name: `p-negqty-${suffix}`, price: 100, quantity: -5 });
      assert.equal(res.status, 400);
    });

    it('refuser un produit gratuit (price = 0) ? Non : il reste autorisé', async () => {
      const res = await createProduct({ name: `p-zero-${suffix}`, price: 0, quantity: 5 });
      assert.equal(res.status, 201);
    });

    it('refuser une commande à quantité 0', async () => {
      const p = await createProduct({ name: `p-q0-${suffix}`, price: 100, quantity: 5 });
      const pid = p.data.product.id;

      const ord = await createOrder([{ product_id: pid, quantity: 0 }]);
      assert.equal(ord.status, 400);
    });

    it('refuser une commande à quantité négative', async () => {
      const p = await createProduct({ name: `p-qneg-${suffix}`, price: 100, quantity: 5 });
      const pid = p.data.product.id;

      const ord = await createOrder([{ product_id: pid, quantity: -2 }]);
      assert.equal(ord.status, 400);
    });

    it('refuser une depense au montant négatif', async () => {
      const res = await api('POST', '/accounting/transactions', {
        body: { type: 'depense', category: 'Achat stock', amount: -5000 },
        token
      });
      assert.equal(res.status, 400);
    });

    it('refuser un revenu manuel au montant négatif', async () => {
      const res = await api('POST', '/accounting/transactions', {
        body: { type: 'revenu', category: 'Autre', amount: -100 },
        token
      });
      assert.equal(res.status, 400);
    });

    it('refuser un final_price négatif lors d\'une vente', async () => {
      const p = await createProduct({ name: `p-fneg-${suffix}`, price: 100, quantity: 5 });
      const pid = p.data.product.id;

      const ord = await createOrder([{ product_id: pid, quantity: 1 }]);
      const orderId = ord.data.order.id;

      const sold = await setStatus(orderId, { status: 'vendu', final_price: -50 });
      assert.equal(sold.status, 400);
    });
  });
});