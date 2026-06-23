import { CategoriesService } from './categories.service';
import { Category } from '../../entities/category.entity';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(): Promise<Category[]>;
    findOne(id: string): Promise<Category>;
    create(body: {
        id?: string;
        name: string;
        parentId?: string;
    }): Promise<Category>;
    update(id: string, body: {
        name: string;
    }): Promise<Category>;
    remove(id: string): Promise<void>;
}
