import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateExercises1711785650000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "exercises",
            columns: [
                { name: "id", type: "integer", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "title", type: "varchar", length: "200" },
                { name: "description", type: "text", isNullable: true },
                { name: "difficulty", type: "varchar" },
                { name: "tags", type: "text", isArray: true, isNullable: true },
                { name: "score", type: "integer", default: 10 },
                { name: "languages", type: "text", isArray: true, isNullable: true },
                { name: "hints", type: "jsonb", isNullable: true },
                { name: "status", type: "varchar", default: "'draft'" },
                { name: "course_id", type: "uuid", isNullable: true },
                { name: "creator_id", type: "uuid" },
                { name: "created_at", type: "timestamp", default: "now()" },
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "test_cases",
            columns: [
                { name: "id", type: "integer", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "exercise_id", type: "integer" },
                { name: "input", type: "text" },
                { name: "expected_output", type: "text" },
                { name: "is_hidden", type: "boolean", default: false },
                { name: "order_idx", type: "integer", default: 0 },
            ]
        }), true);

        await queryRunner.createForeignKeys("exercises", [
            new TableForeignKey({ columnNames: ["course_id"], referencedColumnNames: ["id"], referencedTableName: "courses", onDelete: "SET NULL" }),
            new TableForeignKey({ columnNames: ["creator_id"], referencedColumnNames: ["id"], referencedTableName: "users", onDelete: "CASCADE" })
        ]);

        await queryRunner.createForeignKeys("test_cases", [
            new TableForeignKey({ columnNames: ["exercise_id"], referencedColumnNames: ["id"], referencedTableName: "exercises", onDelete: "CASCADE" })
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("test_cases");
        await queryRunner.dropTable("exercises");
    }
}
