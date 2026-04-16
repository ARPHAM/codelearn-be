import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorRoomDataConsistency1774867126658 implements MigrationInterface {
  name = 'RefactorRoomDataConsistency1774867126658';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "type"`);
    await queryRunner.query(
      `CREATE TYPE "public"."rooms_type_enum" AS ENUM('MEETING', 'CODE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ADD "type" "public"."rooms_type_enum" NOT NULL DEFAULT 'MEETING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_participants" ADD CONSTRAINT "UQ_b00300d77393ffd5c6797841805" UNIQUE ("room_id", "user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room_participants" DROP CONSTRAINT "UQ_b00300d77393ffd5c6797841805"`,
    );
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."rooms_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "rooms" ADD "type" character varying NOT NULL DEFAULT 'MEETING'`,
    );
  }
}
