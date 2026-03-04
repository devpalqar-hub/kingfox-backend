import { Module } from '@nestjs/common';
import { LuckyDrawController } from './lucky-draw.controller';
import { LuckyDrawService } from './lucky-draw.service';

@Module({
  controllers: [LuckyDrawController],
  providers: [LuckyDrawService],
})
export class LuckyDrawModule {}
