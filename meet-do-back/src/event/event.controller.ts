import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create(createEventDto);
  }

  @Get()
  findAll(@Query('activityId') activityId?: string) {
    const hasActivityId = activityId !== undefined && activityId !== '';
    const parsedActivityId = hasActivityId ? Number(activityId) : undefined;

    if (
      hasActivityId &&
      (!Number.isInteger(parsedActivityId) || (parsedActivityId ?? 0) <= 0)
    ) {
      throw new BadRequestException(
        'The activityId query parameter must be a positive integer',
      );
    }

    return this.eventService.findAll(parsedActivityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventService.update(+id, updateEventDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(+id);
  }
}
