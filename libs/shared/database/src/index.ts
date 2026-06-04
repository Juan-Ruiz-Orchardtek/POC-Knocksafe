import { loadEnv } from './load-env';

loadEnv();

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('organizations')
export class OrganizationEntity {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('admins')
export class AdminEntity {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ length: 255 })
  name!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('reps')
export class RepEntity {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ name: 'organization_id', type: 'char', length: 36 })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @Column({ length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ name: 'first_name', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', length: 100 })
  lastName!: string;

  @Column({ length: 50, nullable: true })
  phone!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export function getDatabaseConfig() {
  return {
    type: 'mysql' as const,
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '3306', 10),
    username: process.env['DB_USER'] ?? 'knocksafe',
    password: process.env['DB_PASSWORD'] ?? 'knocksafe',
    database: process.env['DB_NAME'] ?? 'knocksafe',
    entities: [OrganizationEntity, AdminEntity, RepEntity],
    synchronize: process.env['DB_SYNC'] !== 'false',
  };
}

export const JWT_SECRET =
  process.env['JWT_SECRET'] ?? 'knocksafe-poc-dev-secret-change-in-prod';

export const ORGANIZATIONS_SERVICE_URL =
  process.env['ORGANIZATIONS_SERVICE_URL'] ?? 'http://localhost:3002';

export const REPS_SERVICE_URL =
  process.env['REPS_SERVICE_URL'] ?? 'http://localhost:3003';
