import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoomNameAndDescription1774866571495 implements MigrationInterface {
    name = 'AddRoomNameAndDescription1774866571495'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_workspaces" DROP CONSTRAINT "FK_87fe6693df535a622eaf4248697"`);
        await queryRunner.query(`ALTER TABLE "workspace_files" DROP CONSTRAINT "FK_5d19b6f95fd7563dfd7efda060d"`);
        await queryRunner.query(`ALTER TABLE "workspace_files" DROP CONSTRAINT "FK_ddae72d1093ae8a2ddbc1ccf650"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_4504c6b1b0ed64d82ab24597924"`);
        await queryRunner.query(`ALTER TABLE "room_participants" DROP CONSTRAINT "FK_25cf9baa7efbb4d9a924c396b17"`);
        await queryRunner.query(`ALTER TABLE "room_participants" DROP CONSTRAINT "FK_a0a82c13f56ba6082fb122b6adb"`);
        await queryRunner.query(`ALTER TABLE "room_participants" DROP CONSTRAINT "FK_20e505e1f7ce7c1e42b8bcd5a0b"`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD "name" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "user_workspaces" DROP COLUMN "source"`);
        await queryRunner.query(`CREATE TYPE "public"."user_workspaces_source_enum" AS ENUM('LOCAL_UPLOAD', 'FROM_PROBLEM', 'MANUAL')`);
        await queryRunner.query(`ALTER TABLE "user_workspaces" ADD "source" "public"."user_workspaces_source_enum" NOT NULL DEFAULT 'MANUAL'`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "type" SET DEFAULT 'MEETING'`);
        await queryRunner.query(`ALTER TABLE "user_workspaces" ADD CONSTRAINT "FK_87fe6693df535a622eaf4248697" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workspace_files" ADD CONSTRAINT "FK_5d19b6f95fd7563dfd7efda060d" FOREIGN KEY ("workspace_id") REFERENCES "user_workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workspace_files" ADD CONSTRAINT "FK_ddae72d1093ae8a2ddbc1ccf650" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_4504c6b1b0ed64d82ab24597924" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room_participants" ADD CONSTRAINT "FK_25cf9baa7efbb4d9a924c396b17" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room_participants" ADD CONSTRAINT "FK_a0a82c13f56ba6082fb122b6adb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room_participants" ADD CONSTRAINT "FK_20e505e1f7ce7c1e42b8bcd5a0b" FOREIGN KEY ("workspace_id") REFERENCES "user_workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "room_participants" DROP CONSTRAINT "FK_20e505e1f7ce7c1e42b8bcd5a0b"`);
        await queryRunner.query(`ALTER TABLE "room_participants" DROP CONSTRAINT "FK_a0a82c13f56ba6082fb122b6adb"`);
        await queryRunner.query(`ALTER TABLE "room_participants" DROP CONSTRAINT "FK_25cf9baa7efbb4d9a924c396b17"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_4504c6b1b0ed64d82ab24597924"`);
        await queryRunner.query(`ALTER TABLE "workspace_files" DROP CONSTRAINT "FK_ddae72d1093ae8a2ddbc1ccf650"`);
        await queryRunner.query(`ALTER TABLE "workspace_files" DROP CONSTRAINT "FK_5d19b6f95fd7563dfd7efda060d"`);
        await queryRunner.query(`ALTER TABLE "user_workspaces" DROP CONSTRAINT "FK_87fe6693df535a622eaf4248697"`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user_workspaces" DROP COLUMN "source"`);
        await queryRunner.query(`DROP TYPE "public"."user_workspaces_source_enum"`);
        await queryRunner.query(`ALTER TABLE "user_workspaces" ADD "source" character varying NOT NULL DEFAULT 'MANUAL'`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "room_participants" ADD CONSTRAINT "FK_20e505e1f7ce7c1e42b8bcd5a0b" FOREIGN KEY ("workspace_id") REFERENCES "user_workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room_participants" ADD CONSTRAINT "FK_a0a82c13f56ba6082fb122b6adb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room_participants" ADD CONSTRAINT "FK_25cf9baa7efbb4d9a924c396b17" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_4504c6b1b0ed64d82ab24597924" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workspace_files" ADD CONSTRAINT "FK_ddae72d1093ae8a2ddbc1ccf650" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workspace_files" ADD CONSTRAINT "FK_5d19b6f95fd7563dfd7efda060d" FOREIGN KEY ("workspace_id") REFERENCES "user_workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_workspaces" ADD CONSTRAINT "FK_87fe6693df535a622eaf4248697" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
