import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export type TunnelStatus = 'reserved' | 'active' | 'inactive';

@Entity('tunnels')
export class Tunnel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // CHECK constraint enforced at the DB level (see migration) — must match
  // the same subdomain shape the Go server generates for anonymous tunnels.
  @Column({ unique: true })
  subdomain: string;

  @Column({ default: 'reserved' })
  status: TunnelStatus;

  @Column({ name: 'last_connected_at', type: 'timestamptz', nullable: true })
  lastConnectedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
