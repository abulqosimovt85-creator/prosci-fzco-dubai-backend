import { BrandsService } from './brands.service';
import { Brand } from '../../entities/brand.entity';
export declare class BrandsController {
    private readonly brandsService;
    constructor(brandsService: BrandsService);
    findAll(): Promise<Brand[]>;
    findOne(id: string): Promise<Brand>;
    create(body: {
        id?: string;
        name: string;
        logo?: string;
    }): Promise<Brand>;
    update(id: string, body: {
        name: string;
        logo?: string;
    }): Promise<Brand>;
    remove(id: string): Promise<void>;
}
