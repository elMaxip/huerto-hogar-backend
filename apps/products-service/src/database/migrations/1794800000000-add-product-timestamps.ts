import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductTimestamps1794800000000 implements MigrationInterface {
  name = 'AddProductTimestamps1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION products_set_updated_at() RETURNS trigger AS $$
      BEGIN
        NEW."updatedAt" = date_trunc('milliseconds', clock_timestamp());
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_products_updated_at"
      BEFORE UPDATE ON "products"
      FOR EACH ROW EXECUTE FUNCTION products_set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_products_updated_at" ON "products"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS products_set_updated_at()`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "createdAt"`);
  }
}
