import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { AccountController } from './account.controller';

@Module({ imports: [CatalogModule], controllers: [AccountController] })
export class AccountModule {}
