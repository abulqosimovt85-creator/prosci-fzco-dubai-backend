import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Brand } from '../../entities/brand.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,

    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,

    @InjectRepository(Brand)
    private brandRepo: Repository<Brand>,
  ) {}

  async findAll(search = '', category = ''): Promise<Product[]> {
    const qb = this.productRepo.createQueryBuilder('product');

    if (category) {
      // Find category by slug or name to map ID properly
      qb.andWhere(
        '(LOWER(product.category) = LOWER(:category) OR product.categoryId = :category)',
        { category },
      );
    }

    if (search) {
      const searchNormalized = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(product.name) LIKE :search OR LOWER(product.brand) LIKE :search OR LOWER(product.application) LIKE :search OR LOWER(product.description) LIKE :search)',
        { search: searchNormalized },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async create(dto: Partial<Product>): Promise<Product> {
    const id = dto.id || `p-${Math.floor(1000 + Math.random() * 9000)}`;

    // Resolve entities if they exist for proper DB references
    const categorySlug = dto.category
      ? dto.category.toLowerCase().replace(/\s+/g, '-')
      : '';
    const brandSlug = dto.brand
      ? dto.brand.toLowerCase().replace(/\s+/g, '-')
      : '';

    const categoryEntity = await this.categoryRepo.findOne({
      where: { id: categorySlug },
    });
    const brandEntity = await this.brandRepo.findOne({
      where: { id: brandSlug },
    });

    const product = this.productRepo.create({
      id,
      name: dto.name,
      category: dto.category || 'Lab Equipment',
      brand: dto.brand || 'Generic',
      application: dto.application || 'General laboratory use',
      description: dto.description || '',
      specs: dto.specs || {},
      pdf: dto.pdf || '#',
      images: dto.images || [],
      categoryEntity: categoryEntity || undefined,
      brandEntity: brandEntity || undefined,
    } as any) as unknown as Product;

    return this.productRepo.save(product);
  }

  async update(id: string, dto: Partial<Product>): Promise<Product> {
    const product = await this.findOne(id);

    // Merge changes
    Object.assign(product, dto);

    // Resolve entities if Category or Brand name has changed
    if (dto.category) {
      const categorySlug = dto.category.toLowerCase().replace(/\s+/g, '-');
      const categoryEntity = await this.categoryRepo.findOne({
        where: { id: categorySlug },
      });
      if (categoryEntity) product.categoryEntity = categoryEntity;
    }
    if (dto.brand) {
      const brandSlug = dto.brand.toLowerCase().replace(/\s+/g, '-');
      const brandEntity = await this.brandRepo.findOne({
        where: { id: brandSlug },
      });
      if (brandEntity) product.brandEntity = brandEntity;
    }

    return this.productRepo.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepo.remove(product);
  }
}
