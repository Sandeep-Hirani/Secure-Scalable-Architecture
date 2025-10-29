import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

import { getDatabaseConfig } from './database.config';

const getDataSource = (): DataSource => {
  dotenv.config();
  const envFilePath = '.env.development';

  if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath });
  }

  const datasourceOptions: DataSourceOptions = {
    ...getDatabaseConfig(),
  } as DataSourceOptions;
  return new DataSource(datasourceOptions);
};

export default getDataSource();
