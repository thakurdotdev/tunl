import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tunnel } from '../entities/tunnel.entity';
import { User } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { TunnelsController } from './tunnels.controller';
import { TunnelsService } from './tunnels.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tunnel, User]), AuthModule],
  controllers: [TunnelsController],
  providers: [TunnelsService],
  exports: [TunnelsService],
})
export class TunnelsModule {}
