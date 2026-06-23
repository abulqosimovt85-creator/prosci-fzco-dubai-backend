import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepo.find({ 
      relations: { parent: true },
      order: { name: 'ASC' } 
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({ 
      where: { id },
      relations: { parent: true, children: true }
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return category;
  }

  async create(id: string, name: string, parentId?: string): Promise<Category> {
    const finalId = id.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await this.categoryRepo.findOne({ where: { id: finalId } });
    
    if (existing) {
      existing.name = name;
      existing.parentId = parentId || null;
      return this.categoryRepo.save(existing);
    }
    
    const category = this.categoryRepo.create({ 
      id: finalId, 
      name,
      parentId: parentId || null 
    });
    return this.categoryRepo.save(category);
  }

  async update(id: string, name: string): Promise<Category> {
    const category = await this.findOne(id);
    category.name = name;
    return this.categoryRepo.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepo.remove(category);
  }
}
