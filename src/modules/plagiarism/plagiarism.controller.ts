import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlagiarismService } from './plagiarism.service';
import { CheckPlagiarismDto, FlagPairDto } from './dto/plagiarism.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Plagiarism Detection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.LECTURER, Role.ADMIN)
@Controller('plagiarism')
export class PlagiarismController {
  constructor(private readonly plagiarismService: PlagiarismService) {}

  @Post('check/:exerciseId')
  @ApiOperation({ summary: 'Chay phan tich dao van cho toan bo submission' })
  check(
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @Body() dto: CheckPlagiarismDto,
  ) {
    return this.plagiarismService.startCheck(exerciseId, dto.threshold);
  }

  @Get(':exerciseId/results')
  @ApiOperation({ summary: 'Lay ket qua phan tich dao van' })
  results(@Param('exerciseId', ParseIntPipe) exerciseId: number) {
    return this.plagiarismService.getResults(exerciseId);
  }

  @Post('flag')
  @ApiOperation({ summary: 'Danh dau cap dao van' })
  flag(@Body() dto: FlagPairDto) {
    return this.plagiarismService.flagPair(dto);
  }
}
