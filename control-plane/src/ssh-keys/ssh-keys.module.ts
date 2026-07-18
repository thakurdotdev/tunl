import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SshKey } from '../entities/ssh-key.entity';
import { AuthModule } from '../auth/auth.module';
import { SshKeysController } from './ssh-keys.controller';
import { SshKeysService } from './ssh-keys.service';

@Module({
  imports: [TypeOrmModule.forFeature([SshKey]), AuthModule],
  controllers: [SshKeysController],
  providers: [SshKeysService],
  exports: [SshKeysService],
})
export class SshKeysModule {}
