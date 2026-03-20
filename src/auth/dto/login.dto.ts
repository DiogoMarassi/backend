import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'diogo@email.com' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  password: string;
}
