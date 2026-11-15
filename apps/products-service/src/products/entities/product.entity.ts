import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
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

  @Column({ nullable: true })
  discount?: number;

  @Column()
  unidadVenta: string;

  @Column()
  img: string;

  @Column()
  stock: number;

  @Column()
  description: string;
}
