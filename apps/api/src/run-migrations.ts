import { createDataSource } from './data-source';

async function main() {
  const ds = createDataSource();
  await ds.initialize();
  await ds.runMigrations();
  await ds.destroy();
  // eslint-disable-next-line no-console
  console.log('Migrations complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
