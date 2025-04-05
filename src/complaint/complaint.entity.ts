import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Meme } from 'src/video/meme.entity';

@Entity({
  name: 'complaints',
})
export class Complaint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reason: string;

  @Column()
  description: string;

  @Column()
  reviewed: boolean;

  @Column()
  email: string;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'meme_id', nullable: true })
  memeId: number;

  @ManyToOne(() => Meme, (meme) => meme.complaints)
  @JoinColumn({ name: 'meme_id' })
  meme: Meme;
}
