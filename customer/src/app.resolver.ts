import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AppService } from './app.service';
import { CreateCustomerInput } from './app-types/dtos/customer.input';
import { Customer } from './app-types/entities/customer/customer.entity';

@Resolver(() => Customer)
export class AppResolver {
  constructor(private readonly appService: AppService) {}

  @Query(() => String, { name: 'hello' })
  async getHello(): Promise<string> {
    return this.appService.getHello();
  }

  @Query(() => Customer, { name: 'customer' })
  async getCustomer(@Args('id', { type: () => String }) id: string): Promise<Customer> {
    return this.appService.getCustomerById(id);
  }

  @Query(() => Customer, { name: 'decryptedCustomer' })
  async getDecryptedCustomer(@Args('id', { type: () => String }) id: string): Promise<Customer> {
    return this.appService.getDecryptedCustomerById(id);
  }

  @Mutation(() => Customer, { name: 'createCustomer' })
  async createCustomer(
    @Args('input') input: CreateCustomerInput,
  ): Promise<Customer> {
    return this.appService.createCustomer(input);
  }
}
