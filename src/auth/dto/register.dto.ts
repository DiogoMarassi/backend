import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Diogo' })
  name: string;

  @ApiProperty({ example: 'diogo@email.com' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  password: string;

  @ApiPropertyOptional({ example: 'Engenharia / Tecnologia' })
  occupation?: string;

  @ApiPropertyOptional({ example: 'Aprender idiomas' })
  objective?: string;

  @ApiPropertyOptional({ example: 'Intermediário' })
  techLevel?: string;
}
