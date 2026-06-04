import { Module } from '@nestjs/common';
import { MemoGeneratorController } from './memo-generator.controller';
import { MemoGeneratorService } from './memo-generator.service';

@Module({
  controllers: [MemoGeneratorController],
  providers: [MemoGeneratorService],
  exports: [MemoGeneratorService],
})
export class MemoGeneratorModule {}
