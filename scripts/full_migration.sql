-- FULL APPLICATION MIGRATION SQL

-- 1. Users
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "full_name" varchar(100) NOT NULL,
  "email" varchar(150) NOT NULL UNIQUE,
  "mssv" varchar(20),
  "role" varchar NOT NULL,
  "password_hash" varchar NOT NULL,
  "major" varchar(100),
  "avatar_url" varchar,
  "status" varchar DEFAULT 'active',
  "rating" integer DEFAULT 1500,
  "xp" integer DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "IDX_users_email" ON "users"("email");

-- 2. Courses
CREATE TABLE "courses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar NOT NULL,
  "code" varchar NOT NULL,
  "semester" varchar NOT NULL,
  "lecturer_id" uuid,
  "description" text,
  "status" varchar DEFAULT 'active',
  CONSTRAINT "FK_courses_lecturer" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "IDX_courses_name" ON "courses"("name");

-- 3. Enrollments
CREATE TABLE "enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_id" uuid,
  "user_id" uuid,
  "role" varchar NOT NULL,
  CONSTRAINT "FK_enrollments_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_enrollments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_enrollments_course_user" UNIQUE ("course_id", "user_id")
);

-- 4. Assignments
CREATE TABLE "assignments" (
  "id" SERIAL PRIMARY KEY,
  "course_id" uuid,
  "title" varchar NOT NULL,
  "description" text,
  "start_time" TIMESTAMP NOT NULL,
  "due_time" TIMESTAMP NOT NULL,
  "type" varchar NOT NULL,
  "max_attempts" integer DEFAULT 1,
  "is_published" boolean DEFAULT false,
  CONSTRAINT "FK_assignments_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE
);

-- 5. Question Banks
CREATE TABLE "question_banks" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar NOT NULL,
  "type" varchar NOT NULL,
  "description" text,
  "created_by" uuid,
  CONSTRAINT "FK_question_banks_user" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
);

-- 6. Exams
CREATE TABLE "exams" (
  "id" varchar PRIMARY KEY,
  "title" varchar NOT NULL,
  "start_time" TIMESTAMP NOT NULL,
  "end_time" TIMESTAMP NOT NULL,
  "duration" integer NOT NULL,
  "bank_id" integer,
  "course_id" uuid,
  "shuffle" boolean DEFAULT false,
  "status" varchar DEFAULT 'DRAFT',
  CONSTRAINT "FK_exams_bank" FOREIGN KEY ("bank_id") REFERENCES "question_banks"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_exams_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL
);

-- 7. Exam Attempts
CREATE TABLE "exam_attempts" (
  "id" varchar PRIMARY KEY,
  "exam_id" varchar,
  "user_id" uuid,
  "start_time" TIMESTAMP NOT NULL,
  "end_time" TIMESTAMP,
  "score" integer,
  "status" varchar NOT NULL,
  CONSTRAINT "FK_exam_attempts_exam" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_exam_attempts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "IDX_exam_attempts_exam_user" ON "exam_attempts"("exam_id", "user_id");

-- 8. Exam Logs
CREATE TABLE "exam_logs" (
  "id" SERIAL PRIMARY KEY,
  "attempt_id" varchar,
  "event_type" varchar NOT NULL,
  "timestamp" TIMESTAMP NOT NULL,
  "metadata" json,
  CONSTRAINT "FK_exam_logs_attempt" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE
);

-- 9. Problems
CREATE TABLE "problems" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" varchar NOT NULL,
  "slug" varchar NOT NULL UNIQUE,
  "difficulty" varchar NOT NULL,
  "type" varchar NOT NULL,
  "created_by" uuid,
  "status" varchar NOT NULL,
  "visibility" varchar NOT NULL,
  "source" varchar,
  "current_version_id" varchar,
  CONSTRAINT "FK_problems_user" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "IDX_problems_title" ON "problems"("title");

-- 10. Assignment Problems
CREATE TABLE "assignment_problems" (
  "id" SERIAL PRIMARY KEY,
  "assignment_id" integer,
  "problem_id" uuid,
  "order" integer NOT NULL,
  "score" integer NOT NULL,
  "source_type" varchar NOT NULL,
  CONSTRAINT "FK_assignment_problems_assignment" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_assignment_problems_problem" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_assignment_problems_assignment_problem" UNIQUE ("assignment_id", "problem_id")
);

-- 11. Bank Items
CREATE TABLE "bank_items" (
  "id" SERIAL PRIMARY KEY,
  "bank_id" integer,
  "problem_id" uuid,
  "difficulty_override" varchar,
  "score" integer,
  CONSTRAINT "FK_bank_items_bank" FOREIGN KEY ("bank_id") REFERENCES "question_banks"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_bank_items_problem" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE
);

-- 12. Exam Problems
CREATE TABLE "exam_problems" (
  "id" SERIAL PRIMARY KEY,
  "exam_id" varchar,
  "problem_id" uuid,
  "score" integer NOT NULL,
  "order" integer NOT NULL,
  "source_type" varchar NOT NULL,
  CONSTRAINT "FK_exam_problems_exam" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_exam_problems_problem" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_exam_problems_exam_problem" UNIQUE ("exam_id", "problem_id")
);

-- 13. Exercises
CREATE TABLE "exercises" (
  "id" SERIAL PRIMARY KEY,
  "title" varchar(200) NOT NULL,
  "description" text,
  "difficulty" varchar NOT NULL,
  "tags" text[],
  "score" integer DEFAULT 10,
  "languages" text[],
  "hints" jsonb,
  "status" varchar DEFAULT 'draft',
  "course_id" uuid,
  "creator_id" uuid NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "FK_exercises_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_exercises_user" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- 14. Test Cases (Exercises)
CREATE TABLE "test_cases" (
  "id" SERIAL PRIMARY KEY,
  "exercise_id" integer NOT NULL,
  "input" text NOT NULL,
  "expected_output" text NOT NULL,
  "is_hidden" boolean DEFAULT false,
  "order_idx" integer DEFAULT 0,
  CONSTRAINT "FK_test_cases_exercise" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE
);

-- 15. Languages
CREATE TABLE "languages" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar NOT NULL,
  "version" varchar NOT NULL,
  "docker_image" varchar NOT NULL,
  "compile_cmd" text,
  "run_cmd" text NOT NULL
);

-- 16. Problem Versions
CREATE TABLE "problem_versions" (
  "id" varchar PRIMARY KEY,
  "problem_id" uuid,
  "description" text NOT NULL,
  "created_by" uuid,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "status" varchar DEFAULT 'DRAFT',
  CONSTRAINT "FK_problem_versions_problem" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_problem_versions_user" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
);

-- 17. Problem Language Files
CREATE TABLE "problem_language_files" (
  "id" SERIAL PRIMARY KEY,
  "problem_id" uuid,
  "language_id" integer,
  "path" varchar NOT NULL,
  "content" text NOT NULL,
  "type" varchar NOT NULL,
  CONSTRAINT "FK_problem_language_files_problem" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_problem_language_files_language" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE
);
CREATE INDEX "IDX_problem_language_files_problem_language" ON "problem_language_files"("problem_id", "language_id");

-- 18. Testcases (Problem Versions)
CREATE TABLE "testcases" (
  "id" varchar PRIMARY KEY,
  "problem_version_id" varchar,
  "input" text NOT NULL,
  "expected_output" text NOT NULL,
  "score" integer NOT NULL,
  "is_hidden" boolean DEFAULT false,
  "order" integer NOT NULL,
  CONSTRAINT "FK_testcases_problem_version" FOREIGN KEY ("problem_version_id") REFERENCES "problem_versions"("id") ON DELETE CASCADE
);
CREATE INDEX "IDX_testcases_problem_version" ON "testcases"("problem_version_id");

-- 19. Submissions
CREATE TABLE "submissions" (
  "id" varchar PRIMARY KEY,
  "user_id" uuid,
  "problem_version_id" varchar,
  "language_id" integer,
  "code" text,
  "type" varchar NOT NULL,
  "context" varchar NOT NULL,
  "context_id" varchar NOT NULL,
  "status" varchar NOT NULL,
  "score" integer,
  "runtime" integer,
  "memory" integer,
  "error_message" text,
  "testcase_passed" integer,
  "input" text,
  "output" text,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "submitted_at" TIMESTAMP,
  CONSTRAINT "FK_submissions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_submissions_problem_version" FOREIGN KEY ("problem_version_id") REFERENCES "problem_versions"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_submissions_language" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE SET NULL
);
CREATE INDEX "IDX_submissions_user" ON "submissions"("user_id");
CREATE INDEX "IDX_submissions_problem_version" ON "submissions"("problem_version_id");
CREATE INDEX "IDX_submissions_context" ON "submissions"("context");
CREATE INDEX "IDX_submissions_context_id" ON "submissions"("context_id");

-- 20. Submission Files
CREATE TABLE "submission_files" (
  "id" varchar PRIMARY KEY,
  "submission_id" varchar,
  "path" varchar NOT NULL,
  "content" text NOT NULL,
  CONSTRAINT "FK_submission_files_submission" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE
);

-- 21. Submission Results
CREATE TABLE "submission_results" (
  "id" SERIAL PRIMARY KEY,
  "submission_id" varchar,
  "testcase_id" varchar,
  "status" varchar NOT NULL,
  "runtime" integer,
  "memory" integer,
  "output" text,
  "error_message" text,
  CONSTRAINT "FK_submission_results_submission" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_submission_results_testcase" FOREIGN KEY ("testcase_id") REFERENCES "testcases"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_submission_results_submission_testcase" UNIQUE ("submission_id", "testcase_id")
);

-- 22. Execution Jobs
CREATE TABLE "execution_jobs" (
  "id" varchar PRIMARY KEY,
  "submission_id" varchar NOT NULL,
  "status" varchar NOT NULL,
  "worker_id" varchar
);
CREATE INDEX "IDX_execution_jobs_submission_id" ON "execution_jobs"("submission_id");

-- 23. Run Executions
CREATE TABLE "run_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "problem_version_id" uuid NOT NULL,
  "language_id" integer NOT NULL,
  "code" text NOT NULL,
  "input" text,
  "output" text,
  "status" varchar NOT NULL DEFAULT 'queued',
  "runtime" integer,
  "memory" integer,
  "compile_output" text,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "FK_run_executions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_run_executions_problem_version" FOREIGN KEY ("problem_version_id") REFERENCES "problem_versions"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_run_executions_language" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE
);

-- 24. User Workspaces
CREATE TABLE "user_workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "name" varchar NOT NULL,
  "source" varchar NOT NULL DEFAULT 'MANUAL',
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "FK_user_workspaces_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- 25. Workspace Files
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

-- 26. Rooms
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

-- 27. Room Participants
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
