import { DataSource } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { User } from './entities/user.entity';
import { SshKey } from './entities/ssh-key.entity';
import { Tunnel } from './entities/tunnel.entity';

// Used both by NestJS's TypeOrmModule.forRoot (via app.module.ts) and by
// the typeorm CLI (migration:run / migration:generate scripts).
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Plan, User, SshKey, Tunnel],
  migrations: ['migrations/*.sql'],
  synchronize: false, // schema is managed via migrations/001_init.sql, not TypeORM sync
});
