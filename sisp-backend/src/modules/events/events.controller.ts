import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Roles('admin_staff', 'dean', 'faculty', 'student')
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.eventsService.findAll(Number(page) || 1, Number(limit) || 15);
  }

  @Get('categories')
  @Roles('admin_staff', 'dean', 'faculty', 'student')
  async getCategories() {
    return this.eventsService.getCategories();
  }

  @Get(':id')
  @Roles('admin_staff', 'dean', 'faculty', 'student')
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('admin_staff', 'dean')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
  ) {
    return this.eventsService.updateStatus(id, dto);
  }
}
