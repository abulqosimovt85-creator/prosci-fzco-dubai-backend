import { Repository } from 'typeorm';
import { Brand } from '../../entities/brand.entity';
export declare class BrandsService {
    private brandRepo;
    constructor(brandRepo: Repository<Brand>);
    findAll(): Promise<Brand[]>;
    findOne(id: string): Promise<Brand>;
    create(id: string, name: string, logo: string): Promise<Brand>;
    update(id: string, name: string, logo: string): Promise<Brand>;
    remove(id: string): Promise<void>;
}
