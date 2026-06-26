import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { Inquiry } from './entities/inquiry.entity';

// Import feature modules
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { AiModule } from './modules/ai/ai.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? // Railway: use the injected connection URL (PostgreSQL)
          {
            type: 'postgres' as const,
            url: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            entities: [Product, Category, Brand, Inquiry],
            synchronize: true,
            logging: false,
          }
        : // Local / manual config via individual env vars
          {
            type: 'postgres' as const,
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USER || 'proscient',
            password: process.env.DB_PASSWORD || 'proscient_secret',
            database: process.env.DB_NAME || 'proscient_db',
            entities: [Product, Category, Brand, Inquiry],
            synchronize: true,
            logging: false,
          },
    ),
    AuthModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    InquiriesModule,
    AiModule,
    UploadModule,
  ],
})
export class AppModule {}
