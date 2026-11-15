import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Category } from '../../categories/entities/category.entity.js';

@Entity('products')
export class Product {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Category)
  category: Relation<Category>;

  @Column()
  price: number;

  @Column({ type: 'integer', nullable: true })
  discount: number | null;

  @Column()
  unidadVenta: string;

  @Column()
  img: string;

  @Column()
  stock: number;

  @Column()
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
