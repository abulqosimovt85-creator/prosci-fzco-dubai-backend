import { Repository } from 'typeorm';
import { Inquiry } from '../../entities/inquiry.entity';
export declare class InquiriesService {
    private inquiryRepo;
    constructor(inquiryRepo: Repository<Inquiry>);
    findAll(): Promise<Inquiry[]>;
    findOne(id: string): Promise<Inquiry>;
    create(dto: Partial<Inquiry>): Promise<Inquiry>;
    updateStatus(id: string, status: 'pending' | 'in-contact' | 'archived'): Promise<Inquiry>;
}
