import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';

export class FindProductsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids?: string[];
}
