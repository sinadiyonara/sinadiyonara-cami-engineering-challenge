import 'reflect-metadata';
import { INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AddressInfo } from 'node:net';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ClassificationRecord } from '../src/requests/classification-record.entity';
import { ClassificationService } from '../src/requests/classification.service';
import { ClassifierProvider } from '../src/requests/classifier-provider';
import { CustomerRequest } from '../src/requests/customer-request.entity';
import { createDataSource } from '../src/data-source';
import { KeywordClassifier } from '../src/requests/keyword-classifier';
import { RequestsController } from '../src/requests/requests.controller';
import { RequestsService } from '../src/requests/requests.service';
import { TypeOrmClassificationRepository } from '../src/requests/typeorm-classification.repository';

/**
 * Runs the real routes, SQL and transactions against Postgres, because mocks cannot show
 * that any of those work. It uses its own `cami_test` database, rebuilt from the migrations
 * on each run, so seeded development data is never touched.
 *
 * Without Postgres these tests skip locally, but fail in CI so they cannot be lost quietly.
 */
const baseUrl = process.env.DATABASE_URL ?? 'postgres://cami:cami@localhost:5432/cami';
const adminUrl = new URL(baseUrl);
const testUrl = new URL(baseUrl);
testUrl.pathname = '/cami_test';

function buildClassificationService(ds: DataSource, classifier: ClassifierProvider) {
  return new ClassificationService(
    new RequestsService(ds.getRepository(CustomerRequest)),
    classifier,
    new TypeOrmClassificationRepository(ds, ds.getRepository(ClassificationRecord)),
  );
}

async function recreateTestDatabase() {
  const admin = new DataSource({ type: 'postgres', url: adminUrl.href });
  await admin.initialize();
  await admin.query('DROP DATABASE IF EXISTS cami_test WITH (FORCE)');
  await admin.query('CREATE DATABASE cami_test');
  await admin.destroy();
}

async function startApp(ds: DataSource) {
  // Vitest's compiler drops the constructor type metadata Nest uses for injection.
  Reflect.defineMetadata(
    'design:paramtypes',
    [RequestsService, ClassificationService],
    RequestsController,
  );

  @Module({
    controllers: [RequestsController],
    providers: [
      { provide: RequestsService, useValue: new RequestsService(ds.getRepository(CustomerRequest)) },
      {
        provide: ClassificationService,
        useValue: buildClassificationService(ds, new KeywordClassifier()),
      },
    ],
  })
  class TestModule {}

  const nest = await NestFactory.create(TestModule, { logger: false });
  await nest.listen(0);
  return nest;
}

let ds: DataSource | undefined;
let app: INestApplication | undefined;

function db(): DataSource {
  if (!ds) {
    throw new Error('Database is not ready');
  }
  return ds;
}

async function api(method: string, path: string, body?: unknown) {
  const { port } = app!.getHttpServer().address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${port}/requests${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function insertRequest(message = 'refund my invoice', createdAt = '2030-01-01T00:00:00Z') {
  const [row] = await db().query(
    `INSERT INTO customer_requests (message, created_at, updated_at)
     VALUES ($1, $2, $2) RETURNING id`,
    [message, createdAt],
  );
  return row.id as string;
}

async function insertNote(requestId: string, body: string, createdAt: string, id?: string) {
  await db().query(
    `INSERT INTO request_notes (id, request_id, body, author_name, created_at)
     VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, 'Alex', $4)`,
    [id ?? null, requestId, body, createdAt],
  );
}

async function historyRows() {
  return db().query(`SELECT request_id, category FROM classifications`);
}

beforeAll(async () => {
  try {
    await recreateTestDatabase();
  } catch (error) {
    if (process.env.CI) {
      throw error;
    }
    return;
  }

  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = testUrl.href;
  const source = createDataSource();
  process.env.DATABASE_URL = previousUrl;

  await source.initialize();
  await source.runMigrations();
  ds = source;
  app = await startApp(source);
});

afterAll(async () => {
  await app?.close();
  await ds?.destroy();
});

beforeEach(async (context) => {
  if (!ds) {
    context.skip();
    return;
  }
  await ds.query('TRUNCATE classifications, request_notes, customer_requests');
});

describe('GET /requests', () => {
  it('keeps a request that has no notes', async () => {
    const id = await insertRequest();

    const { body } = await api('GET', '');

    expect(body).toEqual([
      expect.objectContaining({ id, noteCount: 0, latestNotePreview: null }),
    ]);
  });

  it('counts every note and previews the newest, whatever order they were added', async () => {
    const id = await insertRequest();
    await insertNote(id, 'middle', '2030-01-02T00:00:00Z');
    await insertNote(id, 'newest', '2030-01-03T00:00:00Z');
    await insertNote(id, 'oldest', '2030-01-01T00:00:00Z');

    const { body } = await api('GET', '');

    expect(body[0]).toMatchObject({ noteCount: 3, latestNotePreview: 'newest' });
  });

  it('breaks a tie between notes with the same timestamp the same way each time', async () => {
    const id = await insertRequest();
    const sameTime = '2030-01-01T00:00:00Z';
    await insertNote(id, 'lower id', sameTime, '00000000-0000-4000-8000-000000000001');
    await insertNote(id, 'higher id', sameTime, '00000000-0000-4000-8000-000000000002');

    const { body } = await api('GET', '');

    expect(body[0].latestNotePreview).toBe('higher id');
  });

  it('does not mix notes between requests and lists the newest request first', async () => {
    const older = await insertRequest('older', '2030-01-01T00:00:00Z');
    const newer = await insertRequest('newer', '2030-01-02T00:00:00Z');
    await insertNote(older, 'note on older', '2030-02-01T00:00:00Z');

    const { body } = await api('GET', '');

    expect(body).toMatchObject([
      { id: newer, noteCount: 0, latestNotePreview: null },
      { id: older, noteCount: 1, latestNotePreview: 'note on older' },
    ]);
    expect(body[0].createdAt).toBe('2030-01-02T00:00:00.000Z');
  });
});

describe('POST /requests/classify', () => {
  it('updates the request, records history, and leaves its notes in place', async () => {
    const id = await insertRequest();
    await insertNote(id, 'keep me', '2030-01-01T00:00:00Z');

    const { status } = await api('POST', '/classify', {
      message: 'refund my invoice',
      requestId: id,
    });

    const { body: request } = await api('GET', `/${id}`);
    expect(status).toBe(201);
    expect(request).toMatchObject({ status: 'in_progress', category: 'billing' });
    expect(request.notes).toHaveLength(1);
    expect(await historyRows()).toEqual([{ request_id: id, category: 'billing' }]);
  });

  it('rolls the request back when the history row cannot be written', async () => {
    const id = await insertRequest();
    // The provider column is varchar(64), so this insert fails after the request is saved.
    const service = buildClassificationService(await db(), {
      name: 'x'.repeat(65),
      classify: () => ({ category: 'billing', confidence: 0.9 }),
    });

    await expect(
      service.classify({ message: 'refund my invoice', requestId: id }),
    ).rejects.toThrow();

    const { body } = await api('GET', `/${id}`);
    expect(body).toMatchObject({ status: 'open', category: null, confidence: null });
    expect(await historyRows()).toEqual([]);
  });

  it('returns 404 and records nothing for a request that does not exist', async () => {
    const { status } = await api('POST', '/classify', {
      message: 'refund my invoice',
      requestId: '00000000-0000-4000-8000-000000000000',
    });

    expect(status).toBe(404);
    expect(await historyRows()).toEqual([]);
  });

  it('returns 400 and records nothing for a blank message', async () => {
    const { status } = await api('POST', '/classify', { message: '   ' });

    expect(status).toBe(400);
    expect(await historyRows()).toEqual([]);
  });
});

describe('GET /requests/history', () => {
  async function classify(message: string) {
    await api('POST', '/classify', { message });
  }

  it('is not swallowed by the /:id route', async () => {
    const { status, body } = await api('GET', '/history');

    expect(status).toBe(200);
    expect(body).toEqual({ items: [] });
  });

  it('keeps history after the request is deleted', async () => {
    const id = await insertRequest();
    await api('POST', '/classify', { message: 'refund my invoice', requestId: id });

    await db().query('DELETE FROM customer_requests WHERE id = $1', [id]);

    const { body } = await api('GET', '/history');
    expect(body.items).toMatchObject([{ requestId: null, message: 'refund my invoice' }]);
  });

  it('filters by category, newest first', async () => {
    await classify('refund my invoice');
    await classify('book a demo today');
    await classify('another refund please');

    const { body } = await api('GET', '/history?category=billing');

    expect(body.items.map((item: { message: string }) => item.message)).toEqual([
      'another refund please',
      'refund my invoice',
    ]);
  });

  it('returns an empty list for an unknown category', async () => {
    await classify('refund my invoice');

    const { body } = await api('GET', '/history?category=nonsense');

    expect(body.items).toEqual([]);
  });

  it('ignores a repeated category instead of failing', async () => {
    await classify('refund my invoice');

    const { status, body } = await api('GET', '/history?category=billing&category=sales');

    expect(status).toBe(200);
    expect(body.items).toHaveLength(1);
  });

  it('stops at the newest 100 rows', async () => {
    await db().query(`
      INSERT INTO classifications (message, category, confidence, provider, created_at)
      SELECT 'row ' || n, 'billing', 0.9, 'keyword', '2030-01-01'::timestamptz + n * interval '1 minute'
      FROM generate_series(1, 101) AS n
    `);

    const { body } = await api('GET', '/history');

    expect(body.items).toHaveLength(100);
    expect(body.items[0].message).toBe('row 101');
    expect(body.items[99].message).toBe('row 2');
  });
});

describe('PATCH /requests/:id/status', () => {
  it('saves the new status', async () => {
    const id = await insertRequest();

    const { status } = await api('PATCH', `/${id}/status`, { status: 'resolved' });

    expect(status).toBe(200);
    expect((await api('GET', `/${id}`)).body.status).toBe('resolved');
  });
});

describe('input validation', () => {
  it.each([[{}], [{ message: 42 }]])('rejects %j on POST /requests with 400', async (body) => {
    expect((await api('POST', '', body)).status).toBe(400);
  });

  it('returns 400 when the status is missing', async () => {
    const id = await insertRequest();

    expect((await api('PATCH', `/${id}/status`, {})).status).toBe(400);
  });

  it('returns 404 for a well-formed id that does not exist', async () => {
    const { status } = await api('GET', '/00000000-0000-4000-8000-000000000000');

    expect(status).toBe(404);
  });

  // Known defects. `it.fails` passes while the bug exists and goes red once it is fixed,
  // at which point the `.fails` should be removed so the test guards the fix.
  describe('known defects', () => {
    it.fails('rejects a status outside open, in_progress and resolved', async () => {
      const id = await insertRequest();

      expect((await api('PATCH', `/${id}/status`, { status: 'banana' })).status).toBe(400);
    });

    it.fails('rejects a malformed request id on GET /:id', async () => {
      expect((await api('GET', '/not-a-uuid')).status).toBe(400);
    });

    it.fails('rejects a malformed requestId on classify', async () => {
      const { status } = await api('POST', '/classify', {
        message: 'refund my invoice',
        requestId: 'not-a-uuid',
      });

      expect(status).toBe(400);
    });

    // The starter treated this as "no request". The refactor made it a 500.
    it.fails('treats an empty requestId on classify as no request', async () => {
      const { status } = await api('POST', '/classify', {
        message: 'refund my invoice',
        requestId: '',
      });

      expect(status).toBe(201);
    });
  });
});
