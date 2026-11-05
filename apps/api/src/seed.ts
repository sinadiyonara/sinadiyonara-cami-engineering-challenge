import { createDataSource } from './data-source';

const MESSAGES = [
  'I need help changing my payment method',
  'Our billing invoice looks wrong this month',
  'Can someone walk me through the sales pricing tiers?',
  'The dashboard is broken after the last deploy',
  'Interested in a demo for our salon booking flow',
  'Refund did not arrive after cancellation',
  'Support ticket: login error on Safari',
  'Looking to upgrade our plan next quarter',
];

const NOTE_BODIES = [
  'Customer called in.',
  'Waiting on screenshot.',
  'Followed up by email.',
  'Escalated to billing ops.',
  'Reproduced locally.',
];

const REQUEST_COUNT = 1200;
const INSERT_CHUNK = 500;

type RequestRow = { message: string; status: string; createdAt: Date };
type NoteRow = { requestId: string; body: string; authorName: string; createdAt: Date };

async function main() {
  const ds = createDataSource();
  await ds.initialize();

  const [{ count }] = await ds.query<[{ count: number }]>(
    'SELECT count(*)::int AS count FROM customer_requests',
  );
  if (count >= REQUEST_COUNT) {
    // eslint-disable-next-line no-console
    console.log(`Seed skipped (${count} requests already present)`);
    await ds.destroy();
    return;
  }

  const now = Date.now();

  // Timestamps are staggered so ordering by created_at is deterministic.
  const requestRows: RequestRow[] = Array.from({ length: REQUEST_COUNT }, (_, i) => ({
    message: `${MESSAGES[i % MESSAGES.length]} (#${i + 1})`,
    status: i % 5 === 0 ? 'resolved' : i % 3 === 0 ? 'in_progress' : 'open',
    createdAt: new Date(now - (REQUEST_COUNT - i) * 60_000),
  }));

  const ids: string[] = [];
  for (let start = 0; start < requestRows.length; start += INSERT_CHUNK) {
    const chunk = requestRows.slice(start, start + INSERT_CHUNK);
    const placeholders = chunk
      .map((_, n) => `($${n * 3 + 1}, $${n * 3 + 2}, $${n * 3 + 3}, $${n * 3 + 3})`)
      .join(', ');
    const inserted = await ds.query<{ id: string }[]>(
      `INSERT INTO customer_requests (message, status, created_at, updated_at)
       VALUES ${placeholders}
       RETURNING id`,
      chunk.flatMap((row) => [row.message, row.status, row.createdAt]),
    );
    ids.push(...inserted.map((row) => row.id));
  }

  const noteRows: NoteRow[] = [];
  ids.forEach((requestId, i) => {
    const noteCount = 3 + (i % 3);
    for (let n = 0; n < noteCount; n += 1) {
      noteRows.push({
        requestId,
        body: `${NOTE_BODIES[n % NOTE_BODIES.length]} [${i + 1}.${n + 1}]`,
        authorName: n % 2 === 0 ? 'Alex' : 'Sam',
        createdAt: new Date(now - (REQUEST_COUNT - i) * 60_000 + n * 1_000),
      });
    }
  });

  for (let start = 0; start < noteRows.length; start += INSERT_CHUNK) {
    const chunk = noteRows.slice(start, start + INSERT_CHUNK);
    const placeholders = chunk
      .map((_, n) => `($${n * 4 + 1}, $${n * 4 + 2}, $${n * 4 + 3}, $${n * 4 + 4})`)
      .join(', ');
    await ds.query(
      `INSERT INTO request_notes (request_id, body, author_name, created_at)
       VALUES ${placeholders}`,
      chunk.flatMap((row) => [row.requestId, row.body, row.authorName, row.createdAt]),
    );
  }

  // eslint-disable-next-line no-console
  console.log(`Seed complete (${ids.length} requests, ${noteRows.length} notes)`);
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
