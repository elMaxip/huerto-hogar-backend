import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PRODUCTS_SERVICE } from './products.constants.js';
import { ProductsController } from './products.controller.js';
import { CategoriesController } from './categories.controller.js';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: PRODUCTS_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('PRODUCTS_SERVICE_HOST', 'localhost'),
            port: Number(config.get('PRODUCTS_SERVICE_PORT', '3002')),
          },
        }),
      },
    ]),
  ],
  controllers: [ProductsController, CategoriesController],
})
export class ProductsModule {}
