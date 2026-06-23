import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { Inquiry } from './entities/inquiry.entity';

// Import feature modules
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: (process.env.DB_TYPE === 'postgres' ? 'postgres' : 'better-sqlite3') as any,
      database: process.env.DB_TYPE === 'postgres' ? 'proscient_db' : 'database.sqlite',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'proscient',
      password: process.env.DB_PASSWORD || 'proscient_secret',
      entities: [Product, Category, Brand, Inquiry],
      synchronize: true, // Auto-sync table structures (highly convenient for development)
      logging: false,
    }),
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    InquiriesModule,
    AiModule,
  ],
})
export class AppModule {}
