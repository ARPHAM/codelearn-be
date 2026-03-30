import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from "typeorm";

export class CreateCourses1711785610000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "courses",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, isGenerated: true, generationStrategy: "uuid" },
                { name: "name", type: "varchar" },
                { name: "code", type: "varchar" },
                { name: "semester", type: "varchar" },
                { name: "lecturer_id", type: "uuid", isNullable: true },
                { name: "description", type: "text", isNullable: true },
                { name: "status", type: "varchar", default: "'active'" },
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "enrollments",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, isGenerated: true, generationStrategy: "uuid" },
                { name: "course_id", type: "uuid", isNullable: true },
                { name: "user_id", type: "uuid", isNullable: true },
                { name: "role", type: "varchar" },
            ],
            uniques: [
                new TableUnique({ columnNames: ["course_id", "user_id"] })
            ]
        }), true);

        await queryRunner.createForeignKeys("courses", [
            new TableForeignKey({ columnNames: ["lecturer_id"], referencedColumnNames: ["id"], referencedTableName: "users", onDelete: "SET NULL" })
        ]);

        await queryRunner.createForeignKeys("enrollments", [
            new TableForeignKey({ columnNames: ["course_id"], referencedColumnNames: ["id"], referencedTableName: "courses", onDelete: "CASCADE" }),
            new TableForeignKey({ columnNames: ["user_id"], referencedColumnNames: ["id"], referencedTableName: "users", onDelete: "CASCADE" })
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("enrollments");
        await queryRunner.dropTable("courses");
    }
}
