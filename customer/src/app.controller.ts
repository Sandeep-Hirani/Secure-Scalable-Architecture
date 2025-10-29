import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateCustomerDto } from './app-types/dtos/customer.input';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello(): Promise<string> {
    return this.appService.getHello();
  }

  @Get('customers/:id')
  async getCustomer(@Param('id') id: string) {
    const customer = await this.appService.getCustomerById(id);
    return customer;
  }

  @Get('customers/:id/decrypted')
  async getDecryptedCustomer(@Param('id') id: string) {
    const customer = await this.appService.getDecryptedCustomerById(id);
    return customer;
  }

  @Post('customers/create')
  async createCustomer(@Body() createCustomerDto: CreateCustomerDto) {
    const createdCustomer = await this.appService.createCustomer(createCustomerDto);
    return createdCustomer;
  }
}
