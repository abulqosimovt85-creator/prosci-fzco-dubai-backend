import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Category } from './category.entity';
import { Brand } from './brand.entity';

@Entity('products')
export class Product {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  category: string; // The text name of category for frontend compatibility

  @Column()
  brand: string; // The text name of brand for frontend compatibility

  @Column()
  application: string;

  @Column('text')
  description: string;

  @Column('simple-json', { nullable: true })
  specs: Record<string, string>;

  @Column({ default: '#' })
  pdf: string;

  @Column('simple-json', { nullable: true })
  images: string[];

  // Optional relations if we want to join, but we keep slugs inside
  @ManyToOne(() => Category, (category) => category.products, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  categoryEntity: Category;

  @ManyToOne(() => Brand, (brand) => brand.products, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'brandId' })
  brandEntity: Brand;
}
