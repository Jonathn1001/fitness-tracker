import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { UpdateTemplateDayDto } from './dto/update-template-day.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  getWeeklyPlan(@CurrentUser() user: { id: string }) {
    return this.templatesService.getWeeklyPlan(user.id);
  }

  @Patch('days/:dayId')
  updateDay(
    @CurrentUser() user: { id: string },
    @Param('dayId') dayId: string,
    @Body() dto: UpdateTemplateDayDto,
  ) {
    return this.templatesService.updateDay(user.id, dayId, dto);
  }
}
