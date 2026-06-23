import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Brand } from '../../entities/brand.entity';
export declare class ProductsService {
    private productRepo;
    private categoryRepo;
    private brandRepo;
    constructor(productRepo: Repository<Product>, categoryRepo: Repository<Category>, brandRepo: Repository<Brand>);
    findAll(search?: string, category?: string): Promise<Product[]>;
    findOne(id: string): Promise<Product>;
    create(dto: Partial<Product>): Promise<Product>;
    update(id: string, dto: Partial<Product>): Promise<Product>;
    remove(id: string): Promise<void>;
}
