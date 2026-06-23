import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../../entities/brand.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandRepo: Repository<Brand>,
  ) {}

  async findAll(): Promise<Brand[]> {
    return this.brandRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand with ID "${id}" not found`);
    }
    return brand;
  }

  async create(id: string, name: string, logo: string): Promise<Brand> {
    const finalId = id.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await this.brandRepo.findOne({ where: { id: finalId } });
    if (existing) {
      existing.name = name;
      existing.logo = logo || name;
      return this.brandRepo.save(existing);
    }
    const brand = this.brandRepo.create({ id: finalId, name, logo: logo || name });
    return this.brandRepo.save(brand);
  }

  async update(id: string, name: string, logo: string): Promise<Brand> {
    const brand = await this.findOne(id);
    brand.name = name;
    brand.logo = logo || name;
    return this.brandRepo.save(brand);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    await this.brandRepo.remove(brand);
  }
}
