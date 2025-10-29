/* eslint-disable */
import { Metadata } from "@grpc/grpc-js";
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export const protobufPackage = "cloud.computing.encryption";

export interface EncryptDataRequest {
  plaintext: string;
  context: { [key: string]: string };
  keyIds: string[];
}

export interface EncryptDataRequest_ContextEntry {
  key: string;
  value: string;
}

export interface EncryptDataResponse {
  ciphertext: string;
}

export interface DecryptDataRequest {
  ciphertext: string;
  context: { [key: string]: string };
}

export interface DecryptDataRequest_ContextEntry {
  key: string;
  value: string;
}

export interface DecryptDataResponse {
  plaintext: string;
}

export const CLOUD_COMPUTING_ENCRYPTION_PACKAGE_NAME = "cloud.computing.encryption";

export interface EncryptionServiceClient {
  encrypt(request: EncryptDataRequest): Observable<EncryptDataResponse>;

  decrypt(request: DecryptDataRequest): Observable<DecryptDataResponse>;
}

export interface EncryptionServiceController {
  encrypt(request: EncryptDataRequest, metadata?: Metadata): Observable<EncryptDataResponse>;

  decrypt(request: DecryptDataRequest, metadata?: Metadata): Observable<DecryptDataResponse>;
}

export function EncryptionServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ["encrypt", "decrypt"];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("EncryptionService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("EncryptionService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const ENCRYPTION_SERVICE_NAME = "EncryptionService";
