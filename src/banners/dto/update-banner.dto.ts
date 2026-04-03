import { IsString, IsOptional, IsUrl, IsBoolean, IsNumber } from 'class-validator';

export class UpdateBannerDto {
  @IsString()
  @IsOptional()
  image?: string; // Banner image URL

  @IsString()
  @IsOptional()
  title?: string; // Optional: Banner title or name

  @IsString()
  @IsOptional()
  description?: string; // Optional: Banner description

  @IsString()
  @IsOptional()
  redirectUrl?: string; // Redirect URL for advertisement, promotion, or game page

  @IsNumber()
  @IsOptional()
  order?: number; // Display order

  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // Whether the banner is active
}
