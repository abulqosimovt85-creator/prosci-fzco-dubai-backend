"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const product_entity_1 = require("./entities/product.entity");
const category_entity_1 = require("./entities/category.entity");
const brand_entity_1 = require("./entities/brand.entity");
const inquiry_entity_1 = require("./entities/inquiry.entity");
const products_module_1 = require("./modules/products/products.module");
const categories_module_1 = require("./modules/categories/categories.module");
const brands_module_1 = require("./modules/brands/brands.module");
const inquiries_module_1 = require("./modules/inquiries/inquiries.module");
const ai_module_1 = require("./modules/ai/ai.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: (process.env.DB_TYPE === 'postgres' ? 'postgres' : 'better-sqlite3'),
                database: process.env.DB_TYPE === 'postgres' ? 'proscient_db' : 'database.sqlite',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                username: process.env.DB_USER || 'proscient',
                password: process.env.DB_PASSWORD || 'proscient_secret',
                entities: [product_entity_1.Product, category_entity_1.Category, brand_entity_1.Brand, inquiry_entity_1.Inquiry],
                synchronize: true,
                logging: false,
            }),
            products_module_1.ProductsModule,
            categories_module_1.CategoriesModule,
            brands_module_1.BrandsModule,
            inquiries_module_1.InquiriesModule,
            ai_module_1.AiModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map