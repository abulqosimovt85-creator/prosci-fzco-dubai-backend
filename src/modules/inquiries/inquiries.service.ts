import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../../entities/inquiry.entity';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry)
    private inquiryRepo: Repository<Inquiry>,
  ) {}

  async findAll(): Promise<Inquiry[]> {
    return this.inquiryRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Inquiry> {
    const inquiry = await this.inquiryRepo.findOne({ where: { id } });
    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID "${id}" not found`);
    }
    return inquiry;
  }

  async create(dto: Partial<Inquiry>): Promise<Inquiry> {
    const inquiry = this.inquiryRepo.create({
      name: dto.name,
      company: dto.company || 'Scientific Partner',
      email: dto.email,
      phone: dto.phone,
      message: dto.message || '',
      productId: dto.productId,
      industry: dto.industry || 'General Science',
      budget: dto.budget || 'AED 50k - 150k',
      status: 'pending',
    });
    return this.inquiryRepo.save(inquiry);
  }

  async updateStatus(id: string, status: 'pending' | 'in-contact' | 'archived'): Promise<Inquiry> {
    const inquiry = await this.findOne(id);
    inquiry.status = status;
    return this.inquiryRepo.save(inquiry);
  }
}
