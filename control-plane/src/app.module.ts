import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity';
import { User } from './entities/user.entity';
import { SshKey } from './entities/ssh-key.entity';
import { Tunnel } from './entities/tunnel.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SshKeysModule } from './ssh-keys/ssh-keys.module';
import { TunnelsModule } from './tunnels/tunnels.module';
import { BillingModule } from './billing/billing.module';
import { UsageModule } from './usage/usage.module';
import { InternalModule } from './internal/internal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Plan, User, SshKey, Tunnel],
      synchronize: false, // schema lives in migrations/001_init.sql
      autoLoadEntities: true,
    }),
    AuthModule,
    UsersModule,
    SshKeysModule,
    TunnelsModule,
    BillingModule,
    UsageModule,
    InternalModule,
  ],
})
export class AppModule {}
