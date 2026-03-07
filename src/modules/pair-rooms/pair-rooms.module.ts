import { Module } from '@nestjs/common';
import { PairRoomsController } from './pair-rooms.controller';
import { PairRoomsService } from './pair-rooms.service';

@Module({
  controllers: [PairRoomsController],
  providers: [PairRoomsService],
})
export class PairRoomsModule {}
