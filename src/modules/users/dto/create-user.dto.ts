import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Diogo', description: 'Nome do usuário' })
  name: string;

  @ApiProperty({ example: 'diogo@email.com', description: 'E-mail único do usuário' })
  email: string;
}
