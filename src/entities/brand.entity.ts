import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Product } from './product.entity';

@Entity('brands')
export class Brand {
  @PrimaryColumn()
  id: string; // e.g., 'exon', 'aura'

  @Column()
  name: string;

  @Column({ nullable: true })
  logo: string;

  @OneToMany(() => Product, (product) => product.brandEntity)
  products: Product[];
}
