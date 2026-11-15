import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  lastProductNumber: number;
}
