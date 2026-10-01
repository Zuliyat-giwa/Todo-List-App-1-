import { Global, Module } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Global()
@Module({ controllers: [OrdersController], providers: [OrdersService, PaymentsService], exports: [OrdersService, PaymentsService] })
export class OrdersModule {}
