import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoomIdToWorkspace1775032045219 implements MigrationInterface {
    name = 'AddRoomIdToWorkspace1775032045219'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_workspaces" ADD "room_id" character varying`);
        await queryRunner.query(`ALTER TABLE "room_sessions" DROP COLUMN "host_id"`);
        await queryRunner.query(`ALTER TABLE "room_sessions" ADD "host_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "room_sessions" DROP COLUMN "host_id"`);
        await queryRunner.query(`ALTER TABLE "room_sessions" ADD "host_id" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "user_workspaces" DROP COLUMN "room_id"`);
    }

}
