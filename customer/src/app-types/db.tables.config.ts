/*
 * contains all schema related config for application
 */
import type { EntityOptions } from 'typeorm';

export const schema = 'public';

interface IToolsTables {
  customer: EntityOptions;
}

export const dbTablesConfig: IToolsTables = {
  customer: { name: 'customer', schema }
};
