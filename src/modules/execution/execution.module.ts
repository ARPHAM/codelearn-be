import { Module } from '@nestjs/common';
import { ExecutionGateway } from './execution.gateway';

@Module({
  providers: [ExecutionGateway],
  exports: [ExecutionGateway],
})
export class ExecutionModule {}
