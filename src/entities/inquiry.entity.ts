import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  company: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column('text')
  message: string;

  @Column({ nullable: true })
  productId: string;

  @Column()
  industry: string;

  @Column()
  budget: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'in-contact' | 'archived';

  @CreateDateColumn()
  createdAt: Date;
}
