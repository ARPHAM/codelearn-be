import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateSubmissions1711785660000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'submissions',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'problem_version_id', type: 'varchar', isNullable: true },
          { name: 'language_id', type: 'integer', isNullable: true },
          { name: 'code', type: 'text', isNullable: true },
          { name: 'type', type: 'varchar' },
          { name: 'context', type: 'varchar' },
          { name: 'context_id', type: 'varchar' },
          { name: 'status', type: 'varchar' },
          { name: 'score', type: 'integer', isNullable: true },
          { name: 'runtime', type: 'integer', isNullable: true },
          { name: 'memory', type: 'integer', isNullable: true },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'testcase_passed', type: 'integer', isNullable: true },
          { name: 'input', type: 'text', isNullable: true },
          { name: 'output', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'submitted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'submission_files',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'submission_id', type: 'varchar', isNullable: true },
          { name: 'path', type: 'varchar' },
          { name: 'content', type: 'text' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'submission_results',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'submission_id', type: 'varchar', isNullable: true },
          { name: 'testcase_id', type: 'varchar', isNullable: true },
          { name: 'status', type: 'varchar' },
          { name: 'runtime', type: 'integer', isNullable: true },
          { name: 'memory', type: 'integer', isNullable: true },
          { name: 'output', type: 'text', isNullable: true },
          { name: 'error_message', type: 'text', isNullable: true },
        ],
        uniques: [
          new TableUnique({ columnNames: ['submission_id', 'testcase_id'] }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'execution_jobs',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'submission_id', type: 'varchar' },
          { name: 'status', type: 'varchar' },
          { name: 'worker_id', type: 'varchar', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'run_executions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'problem_version_id', type: 'uuid' },
          { name: 'language_id', type: 'integer' },
          { name: 'code', type: 'text' },
          { name: 'input', type: 'text', isNullable: true },
          { name: 'output', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', default: "'queued'" },
          { name: 'runtime', type: 'integer', isNullable: true },
          { name: 'memory', type: 'integer', isNullable: true },
          { name: 'compile_output', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    // Foreign Keys
    await queryRunner.createForeignKeys('submissions', [
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['problem_version_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'problem_versions',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['language_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'languages',
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createForeignKeys('submission_files', [
      new TableForeignKey({
        columnNames: ['submission_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'submissions',
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('submission_results', [
      new TableForeignKey({
        columnNames: ['submission_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'submissions',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['testcase_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'testcases',
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('run_executions', [
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['problem_version_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'problem_versions',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['language_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'languages',
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('run_executions');
    await queryRunner.dropTable('execution_jobs');
    await queryRunner.dropTable('submission_results');
    await queryRunner.dropTable('submission_files');
    await queryRunner.dropTable('submissions');
  }
}
