-- 1. Create user_workspaces table
CREATE TABLE "user_workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "name" varchar NOT NULL,
  "source" varchar NOT NULL DEFAULT 'MANUAL',
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "FK_user_workspaces_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- 2. Create workspace_files table
CREATE TABLE "workspace_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "path" varchar NOT NULL,
  "content" text NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "FK_workspace_files_workspace" FOREIGN KEY ("workspace_id") REFERENCES "user_workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_workspace_files_user" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_workspace_files_path" UNIQUE ("workspace_id", "path")
);

-- 3. Create rooms table
CREATE TABLE "rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" varchar NOT NULL,
  "problem_id" integer,
  "status" varchar NOT NULL DEFAULT 'OPEN',
  "created_by" uuid NOT NULL,
  "max_participants" integer NOT NULL DEFAULT 10,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "FK_rooms_user" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
);

-- 4. Create room_participants table
CREATE TABLE "room_participants" (
  "room_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar NOT NULL,
  "workspace_id" uuid NOT NULL,
  "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_room_participants" PRIMARY KEY ("room_id", "user_id"),
  CONSTRAINT "FK_room_participants_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_room_participants_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_room_participants_workspace" FOREIGN KEY ("workspace_id") REFERENCES "user_workspaces"("id") ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX "IDX_user_workspaces_user_id" ON "user_workspaces"("user_id");
CREATE INDEX "IDX_workspace_files_workspace_id" ON "workspace_files"("workspace_id");
CREATE INDEX "IDX_room_participants_room_id" ON "room_participants"("room_id");
CREATE INDEX "IDX_room_participants_user_id" ON "room_participants"("user_id");
