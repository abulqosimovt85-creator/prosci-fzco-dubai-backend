import { Product } from '../../entities/product.entity';
export interface ExtractedProduct {
    name: string;
    description: string;
    specifications: Array<{
        key: string;
        value: string;
    }>;
    isFeatured: boolean;
}
export declare class AiService {
    private cerebras;
    constructor();
    private isUrl;
    private htmlToText;
    private fetchPageContent;
    extractProduct(input: string): Promise<Partial<Product>>;
}
