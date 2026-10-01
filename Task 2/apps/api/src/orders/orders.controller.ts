import { Body, Controller, Get, HttpCode, Param, Post, Query, Headers, Req, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDefined, IsEmail, IsIn, IsOptional, IsString, Length, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Request } from 'express';
import { CartLineDto } from '../cart/cart.controller';
import { AuthUser, CurrentUser, Public } from '../common/decorators';
import { PaymentsService } from '../payments/payments.service';
import { CheckoutInput, orderDto, OrdersService } from './orders.service';

class CustomerDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) @MaxLength(25) phone: string;
}
class AddressDto {
  @IsString() @Length(2, 2) country: string;
  @IsString() @MinLength(2) @MaxLength(80) state: string;
  @IsString() @MinLength(2) @MaxLength(80) city: string;
  @IsString() @MinLength(3) @MaxLength(200) street: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}
class CheckoutDto {
  @IsDefined() @ValidateNested() @Type(() => CustomerDto) customer: CustomerDto;
  @IsDefined() @ValidateNested() @Type(() => AddressDto) address: AddressDto;
  @IsString() @MaxLength(40) shippingMethodId: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CartLineDto) items: CartLineDto[];
  @IsOptional() @IsString() @MaxLength(40) discountCode?: string;
  @IsOptional() @IsString() @MaxLength(80) idempotencyKey?: string;
}
class PayDto {
  @IsOptional() @IsEmail() email?: string;
}
class DevCompleteDto {
  @IsString() reference: string;
  @IsIn(['success', 'failed']) outcome: 'success' | 'failed';
}

@Controller()
export class OrdersController {
  constructor(
    private orders: OrdersService,
    private payments: PaymentsService,
  ) {}

  @Public() @Throttle({ default: { limit: 20, ttl: 60_000 } }) @Post('checkout/orders')
  async create(@Body() dto: CheckoutDto, @CurrentUser() u?: AuthUser) {
    const order = await this.orders.createOrder(dto as CheckoutInput, u?.id);
    return orderDto(order);
  }

  @Public() @Throttle({ default: { limit: 20, ttl: 60_000 } }) @HttpCode(200) @Post('payments/:orderNumber/initialize')
  initialize(@Param('orderNumber') no: string, @Body() dto: PayDto, @CurrentUser() u?: AuthUser) {
    return this.payments.initialize(no, u?.id, dto.email);
  }

  @Public() @Get('payments/verify')
  verify(@Query('reference') reference: string) {
    return this.payments.verify(reference);
  }

  @Public() @HttpCode(200) @Post('payments/webhook/paystack')
  async webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('x-paystack-signature') sig: string, @Body() body: unknown) {
    if (!this.payments.verifySignature(req.rawBody, sig)) throw new ForbiddenException('Invalid signature');
    await this.payments.handleWebhook(body);
    return { received: true };
  }

  @Public() @HttpCode(200) @Post('payments/dev/complete')
  devComplete(@Body() dto: DevCompleteDto) {
    return this.payments.devComplete(dto.reference, dto.outcome);
  }

  @Get('orders')
  async mine(@CurrentUser() u: AuthUser) {
    return this.orders.listForUser(u.id);
  }

  @Public() @Get('orders/:orderNumber')
  async one(@Param('orderNumber') no: string, @Query('email') email?: string, @CurrentUser() u?: AuthUser) {
    return orderDto(await this.orders.getAuthorized(no, u?.id, email));
  }

  @Public() @HttpCode(200) @Post('orders/:orderNumber/cancel')
  async cancel(@Param('orderNumber') no: string, @Query('email') email?: string, @CurrentUser() u?: AuthUser) {
    const o = await this.orders.getAuthorized(no, u?.id, email);
    if (o.status !== 'PENDING_PAYMENT') throw new ForbiddenException('Paid orders can only be cancelled by store staff. Please contact support.');
    await this.orders.cancel(o.id);
    return { ok: true };
  }
}
