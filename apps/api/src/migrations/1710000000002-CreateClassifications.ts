import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassifications1710000000002 implements MigrationInterface {
  name = 'CreateClassifications1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE classifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id uuid NULL REFERENCES customer_requests(id) ON DELETE SET NULL,
        message text NOT NULL,
        category varchar(32) NOT NULL,
        confidence double precision NOT NULL,
        provider varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_classifications_created_at
      ON classifications(created_at DESC, id DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_classifications_category_created_at
      ON classifications(category, created_at DESC, id DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_classifications_request_id
      ON classifications(request_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS classifications;`);
  }
}
