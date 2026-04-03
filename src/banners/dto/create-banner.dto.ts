import { IsString, IsOptional, IsUrl, IsBoolean, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateBannerDto {
  @IsString()
  @IsNotEmpty({ message: 'Image URL is required' })
  image: string; // Banner image URL

  @IsString()
  @IsOptional()
  title?: string; // Optional: Banner title or name

  @IsString()
  @IsOptional()
  description?: string; // Optional: Banner description

  @IsString()
  @IsNotEmpty({ message: 'Redirect URL is required' })
  redirectUrl: string; // Redirect URL for advertisement, promotion, or game page

  @IsNumber()
  @IsOptional()
  order?: number; // Display order (default: 0)

  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // Whether the banner is active (default: true)
}
