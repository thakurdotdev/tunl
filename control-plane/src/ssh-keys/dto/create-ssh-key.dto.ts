import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSshKeyDto {
  @IsString()
  @MinLength(20) // rough floor — real validation happens by attempting to parse it
  publicKey: string;

  @IsString()
  @MaxLength(100)
  label: string = '';
}
