import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplateSeederService } from './template-seeder.service';

@Module({
  providers: [TemplatesService, TemplateSeederService],
  controllers: [TemplatesController],
  exports: [TemplateSeederService],
})
export class TemplatesModule {}
