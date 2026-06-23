import { Category } from './category.entity';
import { Brand } from './brand.entity';
export declare class Product {
    id: string;
    name: string;
    category: string;
    brand: string;
    application: string;
    description: string;
    specs: Record<string, string>;
    pdf: string;
    images: string[];
    categoryEntity: Category;
    brandEntity: Brand;
}
