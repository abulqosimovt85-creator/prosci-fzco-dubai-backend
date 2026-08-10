import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from '../../entities/inquiry.entity';
import { InquiriesService } from './inquiries.service';
import { InquiriesController } from './inquiries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry])],
  controllers: [InquiriesController],
  providers: [InquiriesService],
  exports: [InquiriesService, TypeOrmModule],
})
export class InquiriesModule {}
