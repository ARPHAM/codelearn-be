import { Controller, Get, Post, Param, Body, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { IsNumber, IsString, IsBoolean, IsArray, IsOptional, ValidateNested } from 'class-validator';
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
  @ApiProperty({ type: [ExamRuleDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => ExamRuleDto) rules: ExamRuleDto[];
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() requiredTags?: string[];
  @ApiProperty() @IsBoolean() shuffle: boolean;
}

@ApiTags('Question Bank & Exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post('exams/generate')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Tao de thi ngau nhien tu ngan hang cau hoi' })
  generate(@Body() dto: GenerateExamDto) {
    return this.examsService.generate(dto as any);
  }

  @Get('exams/:id')
  @ApiOperation({ summary: 'Chi tiet de thi' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.findOne(id);
  }

  @Get('questions')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lay danh sach cau hoi trong ngan hang' })
  listQuestions(@Query() _query: any) {
    return { questions: [], total: 0 };
  }
}
