import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('AI Assistant')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Chat với trợ lý AI hỗ trợ lập trình' })
  async chat(@Body() dto: ChatDto) {
    return this.aiService.chat(dto);
  }
}
