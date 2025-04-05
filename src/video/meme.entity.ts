import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Complaint } from 'src/complaint/complaint.entity';

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

  @OneToMany(() => Complaint, (complaint) => complaint.meme)
  complaints: Complaint[];
}
