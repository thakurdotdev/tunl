import { IsNumber, IsString } from 'class-validator';

export class ValidateKeyRequestDto {
  @IsString()
  fingerprint: string;
}

export class UsageEventDto {
  @IsString()
  tunnelId: string;

  @IsNumber()
  bytesTransferred: number;

  @IsString()
  timestamp: string;
}
