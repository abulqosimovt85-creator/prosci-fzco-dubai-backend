import { InquiriesService } from './inquiries.service';
import { Inquiry } from '../../entities/inquiry.entity';
export declare class InquiriesController {
    private readonly inquiriesService;
    constructor(inquiriesService: InquiriesService);
    findAll(): Promise<Inquiry[]>;
    create(body: Partial<Inquiry>): Promise<Inquiry>;
    updateStatus(id: string, body: {
        status: 'pending' | 'in-contact' | 'archived';
    }): Promise<Inquiry>;
}
