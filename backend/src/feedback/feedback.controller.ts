import { Controller, Post, Get, Query, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @Post('generate')
  @HttpCode(200)
  generate(@CurrentUser() user: { id: string }) {
    return this.feedbackService.generate(user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedbackService.findAll(user.id, Number(page) || 1, Number(limit) || 10);
  }
}
