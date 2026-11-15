import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokenHash1794733094112 implements MigrationInterface {
    name = 'AddRefreshTokenHash1794733094112'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshTokenHash" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshTokenHash"`);
    }
}
