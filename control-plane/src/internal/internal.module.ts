import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SshKey } from '../entities/ssh-key.entity';
import { InternalController } from './internal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SshKey])],
  controllers: [InternalController],
})
export class InternalModule {}
