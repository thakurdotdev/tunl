import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('ssh_keys')
export class SshKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'public_key', type: 'text' })
  publicKey: string;

  // SHA256 fingerprint, computed server-side on insert — never trust a
  // client-supplied fingerprint.
  @Column({ unique: true })
  fingerprint: string;

  @Column({ default: '' })
  label: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
