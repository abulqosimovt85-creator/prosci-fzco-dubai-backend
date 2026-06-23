import { Product } from './product.entity';
export declare class Category {
    id: string;
    name: string;
    parentId: string | null;
    parent: Category;
    children: Category[];
    products: Product[];
}
