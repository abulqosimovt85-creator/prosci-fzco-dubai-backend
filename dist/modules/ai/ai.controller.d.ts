import { AiService } from './ai.service';
import { Product } from '../../entities/product.entity';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    generateProduct(body: {
        name?: string;
        category?: string;
        context?: string;
    }): Promise<Partial<Product>>;
}
