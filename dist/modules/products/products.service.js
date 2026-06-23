"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("../../entities/product.entity");
const category_entity_1 = require("../../entities/category.entity");
const brand_entity_1 = require("../../entities/brand.entity");
let ProductsService = class ProductsService {
    productRepo;
    categoryRepo;
    brandRepo;
    constructor(productRepo, categoryRepo, brandRepo) {
        this.productRepo = productRepo;
        this.categoryRepo = categoryRepo;
        this.brandRepo = brandRepo;
    }
    async findAll(search = '', category = '') {
        const qb = this.productRepo.createQueryBuilder('product');
        if (category) {
            qb.andWhere('(LOWER(product.category) = LOWER(:category) OR product.categoryId = :category)', { category });
        }
        if (search) {
            const searchNormalized = `%${search.trim().toLowerCase()}%`;
            qb.andWhere('(LOWER(product.name) LIKE :search OR LOWER(product.brand) LIKE :search OR LOWER(product.application) LIKE :search OR LOWER(product.description) LIKE :search)', { search: searchNormalized });
        }
        return qb.getMany();
    }
    async findOne(id) {
        const product = await this.productRepo.findOne({ where: { id } });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID "${id}" not found`);
        }
        return product;
    }
    async create(dto) {
        const id = dto.id || `p-${Math.floor(1000 + Math.random() * 9000)}`;
        const categorySlug = dto.category ? dto.category.toLowerCase().replace(/\s+/g, '-') : '';
        const brandSlug = dto.brand ? dto.brand.toLowerCase().replace(/\s+/g, '-') : '';
        const categoryEntity = await this.categoryRepo.findOne({ where: { id: categorySlug } });
        const brandEntity = await this.brandRepo.findOne({ where: { id: brandSlug } });
        const product = this.productRepo.create({
            id,
            name: dto.name,
            category: dto.category || 'Lab Equipment',
            brand: dto.brand || 'Generic',
            application: dto.application || 'General laboratory use',
            description: dto.description || '',
            specs: dto.specs || {},
            pdf: dto.pdf || '#',
            images: dto.images || [],
            categoryEntity: categoryEntity || undefined,
            brandEntity: brandEntity || undefined,
        });
        return this.productRepo.save(product);
    }
    async update(id, dto) {
        const product = await this.findOne(id);
        Object.assign(product, dto);
        if (dto.category) {
            const categorySlug = dto.category.toLowerCase().replace(/\s+/g, '-');
            const categoryEntity = await this.categoryRepo.findOne({ where: { id: categorySlug } });
            if (categoryEntity)
                product.categoryEntity = categoryEntity;
        }
        if (dto.brand) {
            const brandSlug = dto.brand.toLowerCase().replace(/\s+/g, '-');
            const brandEntity = await this.brandRepo.findOne({ where: { id: brandSlug } });
            if (brandEntity)
                product.brandEntity = brandEntity;
        }
        return this.productRepo.save(product);
    }
    async remove(id) {
        const product = await this.findOne(id);
        await this.productRepo.remove(product);
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __param(2, (0, typeorm_1.InjectRepository)(brand_entity_1.Brand)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProductsService);
//# sourceMappingURL=products.service.js.map