import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateAssignmentsAndBanks1711785620000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "assignments",
            columns: [
                { name: "id", type: "integer", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "course_id", type: "uuid", isNullable: true },
                { name: "title", type: "varchar" },
                { name: "description", type: "text", isNullable: true },
                { name: "start_time", type: "timestamp" },
                { name: "due_time", type: "timestamp" },
                { name: "type", type: "varchar" },
                { name: "max_attempts", type: "integer", default: 1 },
                { name: "is_published", type: "boolean", default: false },
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "question_banks",
            columns: [
                { name: "id", type: "integer", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "name", type: "varchar" },
                { name: "type", type: "varchar" },
                { name: "description", type: "text", isNullable: true },
                { name: "created_by", type: "uuid", isNullable: true },
            ]
        }), true);

        await queryRunner.createForeignKeys("assignments", [
            new TableForeignKey({ columnNames: ["course_id"], referencedColumnNames: ["id"], referencedTableName: "courses", onDelete: "CASCADE" })
        ]);

        await queryRunner.createForeignKeys("question_banks", [
            new TableForeignKey({ columnNames: ["created_by"], referencedColumnNames: ["id"], referencedTableName: "users", onDelete: "SET NULL" })
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("question_banks");
        await queryRunner.dropTable("assignments");
    }
}
