import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRoomCascades1777467921494 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fix RoomSessions FK
        await queryRunner.query(`ALTER TABLE "room_sessions" DROP CONSTRAINT IF EXISTS "FK_5efac69a4b2bf15f3131b2858d8"`);
        await queryRunner.query(`ALTER TABLE "room_sessions" ADD CONSTRAINT "FK_5efac69a4b2bf15f3131b2858d8" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // Fix RoomParticipants FK
        await queryRunner.query(`ALTER TABLE "room_participants" DROP CONSTRAINT IF EXISTS "FK_25cf9baa7efbb4d9a924c396b17"`);
        await queryRunner.query(`ALTER TABLE "room_participants" ADD CONSTRAINT "FK_25cf9baa7efbb4d9a924c396b17" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert RoomSessions FK
        await queryRunner.query(`ALTER TABLE "room_sessions" DROP CONSTRAINT IF EXISTS "FK_5efac69a4b2bf15f3131b2858d8"`);
        await queryRunner.query(`ALTER TABLE "room_sessions" ADD CONSTRAINT "FK_5efac69a4b2bf15f3131b2858d8" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        // Revert RoomParticipants FK
        await queryRunner.query(`ALTER TABLE "room_participants" DROP CONSTRAINT IF EXISTS "FK_25cf9baa7efbb4d9a924c396b17"`);
        await queryRunner.query(`ALTER TABLE "room_participants" ADD CONSTRAINT "FK_25cf9baa7efbb4d9a924c396b17" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
