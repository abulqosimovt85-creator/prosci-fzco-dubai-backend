import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Brand } from '../../entities/brand.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SeederService } from './seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Brand])],
  controllers: [ProductsController],
  providers: [ProductsService, SeederService],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
