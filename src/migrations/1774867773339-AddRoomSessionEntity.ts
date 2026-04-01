import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoomSessionEntity1774867773339 implements MigrationInterface {
    name = 'AddRoomSessionEntity1774867773339'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "room_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "room_id" uuid NOT NULL, "started_at" TIMESTAMP NOT NULL DEFAULT now(), "ended_at" TIMESTAMP, "status" character varying NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "PK_615ed0651c0d572caa0a284359e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "room_sessions" ADD CONSTRAINT "FK_5efac69a4b2bf15f3131b2858d8" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "room_sessions" DROP CONSTRAINT "FK_5efac69a4b2bf15f3131b2858d8"`);
        await queryRunner.query(`DROP TABLE "room_sessions"`);
    }

}
