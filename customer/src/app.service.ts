import { Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  ENCRYPTION_SERVICE_NAME,
  EncryptionServiceClient,
} from './__protos__/__generated__/src/__protos__/customer/encryption.pb';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './app-types/entities/customer/customer.entity';
import { v4 as uuidv4 } from 'uuid';
import { CreateCustomerInput } from './app-types/dtos/customer.input';

@Injectable()
export class AppService implements OnModuleInit {
  private encryptionService!: EncryptionServiceClient;

  constructor(
    @Inject(ENCRYPTION_SERVICE_NAME)
    private readonly client: ClientGrpc,
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  onModuleInit() {
    this.encryptionService = this.client.getService<EncryptionServiceClient>(
      ENCRYPTION_SERVICE_NAME,
    );
  }

  async getHello(): Promise<string> {
    return 'Hello World!';
  }

  async getCustomerById(id: string): Promise<Customer> {
    const customer = await this.repo.findOne({ where: { id } });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} was not found`);
    }

    return customer;
  }

  async getDecryptedCustomerById(id: string): Promise<Customer> {
    const customer = await this.getCustomerById(id);

    const context = this.buildEncryptionContext(customer.id);

    const [firstName, lastName] = await Promise.all([
      this.decryptData(customer.firstName, context),
      this.decryptData(customer.lastName, context),
    ]);

    return {
      ...customer,
      firstName,
      lastName,
    };
  }

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const customer: Customer = {
      id: uuidv4(),
      firstName: input.firstName,
      lastName: input.lastName,
      status: input.status,
    };

    const context = this.buildEncryptionContext(customer.id);

    const [encryptedFirstName, encryptedLastName] = await Promise.all([
      this.encryptData(customer.firstName, context),
      this.encryptData(customer.lastName, context),
    ]);

    customer.firstName = encryptedFirstName;
    customer.lastName = encryptedLastName;

    await this.repo.insert(customer);
    return customer;
  }

  async encryptData(
    plaintext: string,
    context: Record<string, string> = {},
    keyIds: string[] = [],
  ): Promise<string> {
    const response = await firstValueFrom(
      this.encryptionService.encrypt({
        plaintext,
        context,
        keyIds,
      }),
    );

    return response.ciphertext;
  }

  async decryptData(
    ciphertext: string,
    context: Record<string, string> = {},
  ): Promise<string> {
    const response = await firstValueFrom(
      this.encryptionService.decrypt({
        ciphertext,
        context,
      }),
    );

    return response.plaintext;
  }

  private buildEncryptionContext(customerId: string): Record<string, string> {
    return {
      customerId,
    };
  }
}
