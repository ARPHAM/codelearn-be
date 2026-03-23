// create-assignment.dto.ts
export class CreateAssignmentDto {
  courseId: number;
  title: string;
  description?: string;
  startTime: Date;
  dueTime: Date;
  type: string;
}