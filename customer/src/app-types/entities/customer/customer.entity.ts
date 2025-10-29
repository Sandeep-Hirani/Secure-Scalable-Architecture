/* eslint-disable no-relative-import-paths/no-relative-import-paths */

import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { dbTablesConfig } from '../../db.tables.config';

@ObjectType()
@Entity(dbTablesConfig.customer)
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => String)
  id: string;

  @Column({ nullable: false, name: 'first_name' })
  @Field(() => String)
  firstName: string;

  @Column({ nullable: false, name: 'last_name' })
  @Field(() => String)
  lastName: string;

  @Column({ nullable: false, name: 'status' })
  @Field(() => String)
  status: string;

}
