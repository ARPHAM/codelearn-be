export enum SubmissionStatus {
  QUEUED = 'queued',
  PENDING = 'pending',
  RUNNING = 'running',
  ACCEPTED = 'accepted',
  WRONG_ANSWER = 'wrong_answer',
  TIME_LIMIT = 'time_limit',
  MEMORY_LIMIT = 'memory_limit',
  RUNTIME_ERROR = 'runtime_error',
  COMPILE_ERROR = 'compile_error',
}
