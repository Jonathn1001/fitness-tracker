import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { GeminiService } from './gemini.service';

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService, GeminiService],
})
export class FeedbackModule {}
