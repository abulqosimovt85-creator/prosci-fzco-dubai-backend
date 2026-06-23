import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';
export declare class CategoriesService {
    private categoryRepo;
    constructor(categoryRepo: Repository<Category>);
    findAll(): Promise<Category[]>;
    findOne(id: string): Promise<Category>;
    create(id: string, name: string, parentId?: string): Promise<Category>;
    update(id: string, name: string): Promise<Category>;
    remove(id: string): Promise<void>;
}
