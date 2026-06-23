import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { InquiriesService } from './inquiries.service';
import { Inquiry } from '../../entities/inquiry.entity';

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get()
  findAll(): Promise<Inquiry[]> {
    return this.inquiriesService.findAll();
  }

  @Post()
  create(@Body() body: Partial<Inquiry>): Promise<Inquiry> {
    return this.inquiriesService.create(body);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'pending' | 'in-contact' | 'archived' },
  ): Promise<Inquiry> {
    return this.inquiriesService.updateStatus(id, body.status);
  }
}
