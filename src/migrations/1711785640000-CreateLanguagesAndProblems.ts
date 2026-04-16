import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateLanguagesAndProblems1711785640000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'languages',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'varchar' },
          { name: 'version', type: 'varchar' },
          { name: 'docker_image', type: 'varchar' },
          { name: 'compile_cmd', type: 'text', isNullable: true },
          { name: 'run_cmd', type: 'text' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'problems',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'title', type: 'varchar' },
          { name: 'slug', type: 'varchar', isUnique: true },
          { name: 'difficulty', type: 'varchar' },
          { name: 'type', type: 'varchar' },
          { name: 'created_by', type: 'uuid', isNullable: true },
          { name: 'status', type: 'varchar' },
          { name: 'visibility', type: 'varchar' },
          { name: 'source', type: 'varchar', isNullable: true },
          { name: 'current_version_id', type: 'varchar', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'problem_versions',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'problem_id', type: 'uuid', isNullable: true },
          { name: 'description', type: 'text' },
          { name: 'created_by', type: 'uuid', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'status', type: 'varchar', default: "'DRAFT'" },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'problem_language_files',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'problem_id', type: 'uuid', isNullable: true },
          { name: 'language_id', type: 'integer', isNullable: true },
          { name: 'path', type: 'varchar' },
          { name: 'content', type: 'text' },
          { name: 'type', type: 'varchar' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'testcases',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'problem_version_id', type: 'varchar', isNullable: true },
          { name: 'input', type: 'text' },
          { name: 'expected_output', type: 'text' },
          { name: 'score', type: 'integer' },
          { name: 'is_hidden', type: 'boolean', default: false },
          { name: 'order', type: 'integer' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'assignment_problems',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'assignment_id', type: 'integer', isNullable: true },
          { name: 'problem_id', type: 'uuid', isNullable: true },
          { name: 'order', type: 'integer' },
          { name: 'score', type: 'integer' },
          { name: 'source_type', type: 'varchar' },
        ],
        uniques: [
          new TableUnique({ columnNames: ['assignment_id', 'problem_id'] }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'bank_items',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'bank_id', type: 'integer', isNullable: true },
          { name: 'problem_id', type: 'uuid', isNullable: true },
          { name: 'difficulty_override', type: 'varchar', isNullable: true },
          { name: 'score', type: 'integer', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'exam_problems',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'exam_id', type: 'varchar', isNullable: true },
          { name: 'problem_id', type: 'uuid', isNullable: true },
          { name: 'score', type: 'integer' },
          { name: 'order', type: 'integer' },
          { name: 'source_type', type: 'varchar' },
        ],
        uniques: [new TableUnique({ columnNames: ['exam_id', 'problem_id'] })],
      }),
      true,
    );

    // Foreign Keys
    await queryRunner.createForeignKeys('problems', [
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createForeignKeys('problem_versions', [
      new TableForeignKey({
        columnNames: ['problem_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'problems',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createForeignKeys('problem_language_files', [
      new TableForeignKey({
        columnNames: ['problem_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'problems',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['language_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'languages',
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('testcases', [
      new TableForeignKey({
        columnNames: ['problem_version_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'problem_versions',
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('assignment_problems', [
      new TableForeignKey({
        columnNames: ['assignment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'assignments',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['problem_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'problems',
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('bank_items', [
      new TableForeignKey({
        columnNames: ['bank_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'question_banks',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['problem_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'problems',
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('exam_problems', [
      new TableForeignKey({
        columnNames: ['exam_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'exams',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['problem_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'problems',
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('exam_problems');
    await queryRunner.dropTable('bank_items');
    await queryRunner.dropTable('assignment_problems');
    await queryRunner.dropTable('testcases');
    await queryRunner.dropTable('problem_language_files');
    await queryRunner.dropTable('problem_versions');
    await queryRunner.dropTable('problems');
    await queryRunner.dropTable('languages');
  }
}
