import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({
    description: 'Danh sách các tin nhắn hội thoại',
    example: [{ role: 'user', content: 'Giải thích thuật toán QuickSort' }],
  })
  @IsArray()
  messages: any[];

  @ApiProperty({
    description: 'Ngữ cảnh mã nguồn hiện tại của sinh viên',
    required: false,
  })
  @IsString()
  @IsOptional()
  codeContext?: string;

  @ApiProperty({
    description: 'Ngữ cảnh bài tập (tiêu đề, mô tả)',
    required: false,
  })
  @IsOptional()
  problemContext?: {
    title: string;
    description: string;
  };
}
