import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';
import { SetsService } from './sets.service';
import { RoundsService } from './rounds.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { UpsertSetDto } from './dto/upsert-set.dto';
import { UpsertRoundDto } from './dto/upsert-round.dto';
import { FindSessionsDto } from './dto/find-sessions.dto';
import { UpdateSetDto } from './dto/update-set.dto';
import { UpdateRoundDto } from './dto/update-round.dto';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private sessionsService: SessionsService,
    private setsService: SetsService,
    private roundsService: RoundsService,
  ) {}

  @Post()
  create(@CurrentUser() u: { id: string }, @Body() dto: CreateSessionDto) {
    return this.sessionsService.create(u.id, dto);
  }

  @Get()
  findAll(@CurrentUser() u: { id: string }, @Query() query: FindSessionsDto) {
    return this.sessionsService.findAll(u.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.sessionsService.findOne(u.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.update(u.id, id, dto);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.sessionsService.complete(u.id, id);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.sessionsService.remove(u.id, id);
  }

  @Put(':id/sets')
  upsertSets(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() dtos: UpsertSetDto[],
  ) {
    return this.setsService.upsertSets(u.id, id, dtos);
  }

  @Patch(':id/sets/:setId')
  updateSet(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Param('setId') setId: string,
    @Body() data: UpdateSetDto,
  ) {
    return this.setsService.updateSet(u.id, id, setId, data);
  }

  @Put(':id/rounds')
  upsertRounds(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() dtos: UpsertRoundDto[],
  ) {
    return this.roundsService.upsertRounds(u.id, id, dtos);
  }

  @Patch(':id/rounds/:roundId')
  updateRound(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Param('roundId') roundId: string,
    @Body() data: UpdateRoundDto,
  ) {
    return this.roundsService.updateRound(u.id, id, roundId, data);
  }
}
