import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'max_reserved_subdomains', default: 1 })
  maxReservedSubdomains: number;

  // Enforced unique-when-true at the DB level via a partial unique index
  // (see migrations/001_init.sql) — signup finds "the" default plan via
  // this flag rather than hardcoding a UUID or name.
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
