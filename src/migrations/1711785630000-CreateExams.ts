import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateExams1711785630000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'exams',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'title', type: 'varchar' },
          { name: 'start_time', type: 'timestamp' },
          { name: 'end_time', type: 'timestamp' },
          { name: 'duration', type: 'integer' },
          { name: 'bank_id', type: 'integer', isNullable: true },
          { name: 'course_id', type: 'uuid', isNullable: true },
          { name: 'shuffle', type: 'boolean', default: false },
          { name: 'status', type: 'varchar', default: "'DRAFT'" },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'exam_attempts',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'exam_id', type: 'varchar', isNullable: true },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'start_time', type: 'timestamp' },
          { name: 'end_time', type: 'timestamp', isNullable: true },
          { name: 'score', type: 'integer', isNullable: true },
          { name: 'status', type: 'varchar' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'exam_logs',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'attempt_id', type: 'varchar', isNullable: true },
          { name: 'event_type', type: 'varchar' },
          { name: 'timestamp', type: 'timestamp' },
          { name: 'metadata', type: 'json', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('exams', [
      new TableForeignKey({
        columnNames: ['bank_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'question_banks',
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['course_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createForeignKeys('exam_attempts', [
      new TableForeignKey({
        columnNames: ['exam_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'exams',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('exam_logs', [
      new TableForeignKey({
        columnNames: ['attempt_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'exam_attempts',
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('exam_logs');
    await queryRunner.dropTable('exam_attempts');
    await queryRunner.dropTable('exams');
  }
}
