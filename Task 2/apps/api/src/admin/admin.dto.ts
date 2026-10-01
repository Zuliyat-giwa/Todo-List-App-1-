import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, Length, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

export class ImageDto {
  @IsString() @MaxLength(1000) url: string;
  @IsOptional() @IsString() @MaxLength(200) alt?: string;
}
export class VariantDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(2) @MaxLength(60) sku: string;
  @IsOptional() @IsString() @MaxLength(40) size?: string;
  @IsOptional() @IsString() @MaxLength(40) color?: string;
  @IsOptional() @IsInt() @Min(0) priceMinor?: number;
  @IsInt() @Min(0) stock: number;
}
export class AttributeDto {
  @IsString() @MaxLength(60) key: string;
  @IsString() @MaxLength(500) value: string;
}

export class ProductDto {
  @IsString() @MinLength(2) @MaxLength(200) name: string;
  @IsOptional() @IsString() @MaxLength(200) nameAr?: string;
  @IsString() @MinLength(5) @MaxLength(5000) description: string;
  @IsOptional() @IsString() @MaxLength(5000) descriptionAr?: string;
  @IsString() categoryId: string;
  @IsIn(['WOMEN', 'MEN', 'KIDS', 'BOYS', 'GIRLS', 'UNISEX']) audience: any;
  @IsOptional() @IsString() @MaxLength(80) brand?: string;
  @IsOptional() @IsString() @MaxLength(120) material?: string;
  @IsOptional() @IsString() @MaxLength(80) collection?: string;
  @IsInt() @Min(0) priceMinor: number;
  @IsOptional() @IsInt() @Min(0) salePriceMinor?: number | null;
  @IsString() @MinLength(2) @MaxLength(60) baseSku: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isNewArrival?: boolean;
  @IsOptional() @IsBoolean() isBestSeller?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => ImageDto) images: ImageDto[];
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => VariantDto) variants: VariantDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => AttributeDto) attributes?: AttributeDto[];
}

export class CategoryDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(80) nameAr?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(1000) imageUrl?: string;
  @IsOptional() @IsString() parentId?: string | null;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class OrderStatusDto {
  @IsEnum(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']) status: any;
}
export class ShipmentDto {
  @IsOptional() @IsString() @MaxLength(80) carrier?: string;
  @IsString() @MinLength(3) @MaxLength(80) trackingNumber: string;
}
export class RoleDto {
  @IsIn(['CUSTOMER', 'ADMIN']) role: 'CUSTOMER' | 'ADMIN';
}

export class DiscountDto {
  @IsString() @MinLength(3) @MaxLength(30) code: string;
  @IsIn(['PERCENT', 'FIXED']) type: 'PERCENT' | 'FIXED';
  @IsInt() @Min(1) value: number;
  @IsOptional() @IsInt() @Min(0) minPurchaseMinor?: number;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number | null;
  @IsOptional() @IsDateString() expiresAt?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class BannerDto {
  @IsString() @MaxLength(120) title: string;
  @IsOptional() @IsString() @MaxLength(300) subtitle?: string;
  @IsOptional() @IsString() @MaxLength(60) ctaLabel?: string;
  @IsOptional() @IsString() @MaxLength(300) ctaHref?: string;
  @IsString() @MaxLength(1000) imageUrl: string;
  @IsOptional() @IsIn(['hero', 'promo']) placement?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class FaqDto {
  @IsString() @MaxLength(300) question: string;
  @IsString() @MaxLength(3000) answer: string;
  @IsOptional() @IsInt() sortOrder?: number;
}
export class PolicyDto {
  @IsString() @MaxLength(100) title: string;
  @IsString() @MaxLength(10000) body: string;
}

export class ShippingMethodDto {
  @IsString() @MaxLength(80) name: string;
  @IsInt() @Min(0) priceMinor: number;
  @IsOptional() @IsInt() @Min(0) freeOverMinor?: number | null;
  @IsInt() @Min(0) @Max(90) minDays: number;
  @IsInt() @Min(0) @Max(90) maxDays: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class CountryDto {
  @IsString() @Length(2, 2) code: string;
  @IsString() @MaxLength(80) name: string;
  @IsIn(['en', 'ar']) language: string;
  @IsString() @Length(3, 3) currency: string;
  @IsNumber() @Min(0) rateFromBase: number;
  @IsNumber() @Min(0) @Max(100) taxPercent: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class StoreInfoDto {
  @IsString() @MaxLength(100) name: string;
  @IsString() @MaxLength(254) supportEmail: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(300) announcement?: string;
}
