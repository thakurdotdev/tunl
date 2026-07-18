import { IsEmail, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}
