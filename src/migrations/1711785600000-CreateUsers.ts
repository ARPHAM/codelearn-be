import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsers1711785600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'full_name', type: 'varchar', length: '100' },
          { name: 'email', type: 'varchar', length: '150', isUnique: true },
          { name: 'mssv', type: 'varchar', length: '20', isNullable: true },
          { name: 'role', type: 'varchar' },
          { name: 'password_hash', type: 'varchar' },
          { name: 'major', type: 'varchar', length: '100', isNullable: true },
          { name: 'avatar_url', type: 'varchar', isNullable: true },
          { name: 'status', type: 'varchar', default: "'active'" },
          { name: 'rating', type: 'integer', default: 1500 },
          { name: 'xp', type: 'integer', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
