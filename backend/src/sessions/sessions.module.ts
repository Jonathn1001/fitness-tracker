import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SetsService } from './sets.service';
import { RoundsService } from './rounds.service';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, SetsService, RoundsService],
})
export class SessionsModule {}
