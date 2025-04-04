import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'memes',
})
export class Meme {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  link: string;

  @Column({ name: 'ip_address' })
  ipAddress: string;

  @Column()
  deleted: boolean;

  @Column({ name: 'created_at' })
  createdAt: Date;
}
