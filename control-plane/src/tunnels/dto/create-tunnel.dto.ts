import { Matches } from 'class-validator';

export class CreateTunnelDto {
  // Must match the same shape enforced by the DB CHECK constraint and used
  // by the Go server's generated subdomains.
  @Matches(/^[a-z0-9-]{3,63}$/)
  subdomain: string;
}
