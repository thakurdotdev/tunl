import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TunnelsService } from './tunnels.service';
import { CreateTunnelDto } from './dto/create-tunnel.dto';

@Controller('tunnels')
@UseGuards(JwtAuthGuard)
export class TunnelsController {
  constructor(private readonly tunnels: TunnelsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateTunnelDto) {
    return this.tunnels.create(req.user.userId, dto);
  }

  @Get()
  list(@Req() req: any) {
    return this.tunnels.list(req.user.userId);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.tunnels.remove(req.user.userId, id);
  }
}
