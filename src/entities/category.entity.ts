import { Entity, Column, PrimaryColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('categories')
export class Category {
  @PrimaryColumn()
  id: string; // e.g., 'analytical', 'lab-equipment'

  @Column()
  name: string;

  @Column({ nullable: true })
  parentId: string | null;

  @ManyToOne(() => Category, (category) => category.children, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @OneToMany(() => Product, (product) => product.categoryEntity)
  products: Product[];
}
