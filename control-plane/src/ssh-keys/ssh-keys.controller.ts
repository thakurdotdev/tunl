import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SshKeysService } from './ssh-keys.service';
import { CreateSshKeyDto } from './dto/create-ssh-key.dto';

@Controller('ssh-keys')
@UseGuards(JwtAuthGuard)
export class SshKeysController {
  constructor(private readonly sshKeys: SshKeysService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateSshKeyDto) {
    return this.sshKeys.create(req.user.userId, dto);
  }

  @Get()
  list(@Req() req: any) {
    return this.sshKeys.list(req.user.userId);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.sshKeys.remove(req.user.userId, id);
  }
}
