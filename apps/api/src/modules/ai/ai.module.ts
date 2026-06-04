import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiController } from './ai.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AiController],
  providers: [],
  exports: [],
})
export class AiModule {}