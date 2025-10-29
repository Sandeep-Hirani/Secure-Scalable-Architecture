/* eslint-disable */
import { Metadata } from "@grpc/grpc-js";
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export const protobufPackage = "cloud.computing.CustomerService";

/** Definition of the Customer message type */
export interface Customer {
  firstName: string;
  lastName: string;
  id: number;
  number: string;
  status: string;
}

/** Request message for the getCustomer RPC */
export interface GetCustomerRequest {
  customerId: number;
}

/** Response message for the getCustomer RPC */
export interface CustomerResponse {
  customer: Customer | undefined;
}

/** Request message for the insertCustomer RPC */
export interface InsertCustomerRequest {
  newCustomer: Customer | undefined;
}

/** Response message for the insertCustomer RPC */
export interface InsertCustomerResponse {
  message: string;
}

export const CLOUD_COMPUTING__CUSTOMER_SERVICE_PACKAGE_NAME = "cloud.computing.CustomerService";

/** Definition of the Customer service */

export interface CustomerServiceClient {
  /** Get a customer by their ID */

  getCustomer(request: GetCustomerRequest, metadata?: Metadata): Observable<CustomerResponse>;

  /** Insert a new customer */

  insertCustomer(request: InsertCustomerRequest, metadata?: Metadata): Observable<InsertCustomerResponse>;
}

/** Definition of the Customer service */

export interface CustomerServiceController {
  /** Get a customer by their ID */

  getCustomer(request: GetCustomerRequest, metadata?: Metadata): Observable<CustomerResponse>;

  /** Insert a new customer */

  insertCustomer(request: InsertCustomerRequest, metadata?: Metadata): Observable<InsertCustomerResponse>;
}

export function CustomerServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ["getCustomer", "insertCustomer"];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("CustomerService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("CustomerService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const CUSTOMER_SERVICE_NAME = "CustomerService";
