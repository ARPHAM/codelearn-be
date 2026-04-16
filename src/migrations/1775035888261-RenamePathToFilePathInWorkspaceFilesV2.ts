import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePathToFilePathInWorkspaceFilesV21775035888261 implements MigrationInterface {
  name = 'RenamePathToFilePathInWorkspaceFilesV21775035888261';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_files" DROP CONSTRAINT "UQ_b89bf6478d053f89f85efe53848"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_files" RENAME COLUMN "path" TO "file_path"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_files" ADD CONSTRAINT "UQ_4cbc3e61d3396b69ff5215052f2" UNIQUE ("workspace_id", "file_path")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_files" DROP CONSTRAINT "UQ_4cbc3e61d3396b69ff5215052f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_files" RENAME COLUMN "file_path" TO "path"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_files" ADD CONSTRAINT "UQ_b89bf6478d053f89f85efe53848" UNIQUE ("workspace_id", "path")`,
    );
  }
}
