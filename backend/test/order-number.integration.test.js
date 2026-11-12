import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/server.js';
import pool from '../src/config/database.js';

// ---------------------------------------------------------------------------
// Tests d'intégration : numérotation des commandes propre à chaque boutique.
// - id technique = UUID
// - order_number = 1, 2, 3... indépendamment pour chaque boutique
// ---------------------------------------------------------------------------

const BASE = '/api';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let server;
let baseURL;
const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const createdShops = [];

const api = async (method, path, { body, token } = {}) => {
  const res = await fetch(`${baseURL}${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
};

const registerShop = async (label) => {
  const res = await api('POST', '/auth/register', {
    body: {
      shopName: `test-order-${label}-${suffix}`,
      username: `admin-${label}-${suffix}`,
      email: `order-${label}-${suffix}@example.com`,
      password: 'testpass123'
    }
  });

  assert.equal(res.status, 201, `Register échoué: ${JSON.stringify(res.data)}`);
  createdShops.push(res.data.user.shop_id);
  return res.data.token;
};

const createProduct = async (token, label) => {
  const res = await api('POST', '/products', {
    body: { name: `produit-${label}-${suffix}`, price: 100, quantity: 100 },
    token
  });
  assert.equal(res.status, 201, `Produit non créé: ${JSON.stringify(res.data)}`);
  return res.data.product.id;
};

const createOrder = async (token, productId, quantity = 1) => {
  return api('POST', '/orders', {
    body: {
      customer_name: 'Client Test',
      customer_phone: '0320000000',
      customer_email: '',
      delivery_address: 'Antananarivo',
      delivery_date: new Date().toISOString(),
      items: [{ product_id: productId, quantity }]
    },
    token
  });
};

const orderNumber = (order) => Number(order.order_number);

describe('Numérotation des commandes par boutique', () => {
  let tokenA;
  let tokenB;
  let productA;
  let productB;

  before(async () => {
    // Nettoyage des éventuelles boutiques de test résiduelles.
    await pool.query(`DELETE FROM shops WHERE name LIKE 'test-order-%'`);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseURL = `http://127.0.0.1:${server.address().port}`;

    tokenA = await registerShop('a');
    tokenB = await registerShop('b');
    productA = await createProduct(tokenA, 'a');
    productB = await createProduct(tokenB, 'b');
  });

  after(async () => {
    for (const shopId of createdShops) {
      await pool.query('DELETE FROM shops WHERE id = $1', [shopId]);
    }
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  it('conserve un identifiant UUID et un numéro métier numérique', async () => {
    const res = await createOrder(tokenA, productA);

    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.match(res.data.order.id, UUID_RE, 'id doit rester un UUID');
    assert.equal(orderNumber(res.data.order), 1);
  });

  it('incrémente 1, 2, 3... dans une même boutique', async () => {
    const second = await createOrder(tokenA, productA);
    const third = await createOrder(tokenA, productA);

    assert.equal(orderNumber(second.data.order), 2);
    assert.equal(orderNumber(third.data.order), 3);
  });

  it('démarre aussi à 1 pour une autre boutique', async () => {
    const first = await createOrder(tokenB, productB);
    assert.equal(first.status, 201, JSON.stringify(first.data));
    assert.equal(orderNumber(first.data.order), 1);

    const second = await createOrder(tokenB, productB);
    assert.equal(orderNumber(second.data.order), 2);
  });

  it('alloue des numéros uniques lors de créations concurrentes', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => createOrder(tokenA, productA))
    );

    for (const res of results) {
      assert.equal(res.status, 201, JSON.stringify(res.data));
    }

    const numbers = results.map((res) => orderNumber(res.data.order));
    const unique = new Set(numbers);

    assert.equal(unique.size, 8, `numéros dupliqués: ${numbers.join(', ')}`);
    for (const n of numbers) {
      assert.ok(n > 3, `le numéro ${n} ne continue pas la séquence de la boutique A`);
    }

    // La boutique B n'est pas impactée par l'activité de la boutique A.
    const shopB = await createOrder(tokenB, productB);
    assert.equal(orderNumber(shopB.data.order), 3);
  });

  it('refuse un doublon (shop_id, order_number) au niveau base', async () => {
    const [shopId] = createdShops;
    const duplicate = await pool.query(
      `INSERT INTO orders (shop_id, order_number, customer_name, delivery_address, delivery_date)
       SELECT shop_id, order_number, 'Doublon', 'Antananarivo', NOW()
       FROM orders WHERE shop_id = $1 LIMIT 1`,
      [shopId]
    ).catch((error) => error);

    assert.ok(duplicate instanceof Error, 'un doublon de numéro doit être rejeté');
    assert.match(duplicate.message, /orders_shop_order_number_unique|duplicate key/i);
  });
});
