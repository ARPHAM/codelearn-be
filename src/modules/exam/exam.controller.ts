import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamService } from './exam.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  IsNumber,
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ExamRuleDto {
  @ApiProperty() @IsString() difficulty: string;
  @ApiProperty() @IsNumber() @Type(() => Number) count: number;
  @ApiProperty() @IsNumber() @Type(() => Number) score: number;
}
class GenerateExamDto {
  @ApiProperty() @IsNumber() @Type(() => Number) courseId: number;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsNumber() @Type(() => Number) duration: number;
  @ApiProperty({ type: [ExamRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamRuleDto)
  rules: ExamRuleDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  requiredTags?: string[];
  @ApiProperty() @IsBoolean() shuffle: boolean;
}

@ApiTags('Question Bank & Exam')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Tao de thi ngau nhien tu ngan hang cau hoi' })
  generate(@Body() dto: GenerateExamDto) {
    return this.examService.generate(dto as any);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiet de thi' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.examService.findOne(id);
  }

  @Get('questions')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lay danh sach cau hoi trong ngan hang' })
  listQuestions(@Query() _query: any) {
    return { questions: [], total: 0 };
  }
}
