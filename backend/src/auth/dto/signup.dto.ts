import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  @Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain a digit' })
  password: string;

  @IsString()
  @MinLength(2)
  name: string;
}
