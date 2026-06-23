export declare class Inquiry {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    message: string;
    productId: string;
    industry: string;
    budget: string;
    status: 'pending' | 'in-contact' | 'archived';
    createdAt: Date;
}
