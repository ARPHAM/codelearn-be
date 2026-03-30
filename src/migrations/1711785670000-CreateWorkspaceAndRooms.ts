import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from "typeorm";

export class CreateWorkspaceAndRooms1711785670000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "user_workspaces",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, isGenerated: true, generationStrategy: "uuid" },
                { name: "user_id", type: "uuid" },
                { name: "name", type: "varchar" },
                { name: "source", type: "varchar", default: "'MANUAL'" },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" },
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "workspace_files",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, isGenerated: true, generationStrategy: "uuid" },
                { name: "workspace_id", type: "uuid" },
                { name: "path", type: "varchar" },
                { name: "content", type: "text" },
                { name: "created_by", type: "uuid" },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" },
            ],
            uniques: [
                new TableUnique({ columnNames: ["workspace_id", "path"] })
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "rooms",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, isGenerated: true, generationStrategy: "uuid" },
                { name: "type", type: "varchar" },
                { name: "problem_id", type: "integer", isNullable: true },
                { name: "status", type: "varchar", default: "'OPEN'" },
                { name: "created_by", type: "uuid" },
                { name: "max_participants", type: "integer", default: 10 },
                { name: "created_at", type: "timestamp", default: "now()" },
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "room_participants",
            columns: [
                { name: "room_id", type: "uuid", isPrimary: true },
                { name: "user_id", type: "uuid", isPrimary: true },
                { name: "role", type: "varchar" },
                { name: "workspace_id", type: "uuid" },
                { name: "joined_at", type: "timestamp", default: "now()" },
            ]
        }), true);

        // Foreign Keys
        await queryRunner.createForeignKeys("user_workspaces", [
            new TableForeignKey({ columnNames: ["user_id"], referencedColumnNames: ["id"], referencedTableName: "users", onDelete: "CASCADE" })
        ]);

        await queryRunner.createForeignKeys("workspace_files", [
            new TableForeignKey({ columnNames: ["workspace_id"], referencedColumnNames: ["id"], referencedTableName: "user_workspaces", onDelete: "CASCADE" }),
            new TableForeignKey({ columnNames: ["created_by"], referencedColumnNames: ["id"], referencedTableName: "users", onDelete: "CASCADE" })
        ]);

        await queryRunner.createForeignKeys("rooms", [
            new TableForeignKey({ columnNames: ["created_by"], referencedColumnNames: ["id"], referencedTableName: "users", onDelete: "CASCADE" })
        ]);

        await queryRunner.createForeignKeys("room_participants", [
            new TableForeignKey({ columnNames: ["room_id"], referencedColumnNames: ["id"], referencedTableName: "rooms", onDelete: "CASCADE" }),
            new TableForeignKey({ columnNames: ["user_id"], referencedColumnNames: ["id"], referencedTableName: "users", onDelete: "CASCADE" }),
            new TableForeignKey({ columnNames: ["workspace_id"], referencedColumnNames: ["id"], referencedTableName: "user_workspaces", onDelete: "CASCADE" })
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("room_participants");
        await queryRunner.dropTable("rooms");
        await queryRunner.dropTable("workspace_files");
        await queryRunner.dropTable("user_workspaces");
    }
}
