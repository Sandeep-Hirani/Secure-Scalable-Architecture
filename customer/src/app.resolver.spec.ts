import { AppResolver } from './app.resolver';
import { AppService } from './app.service';

describe('AppResolver', () => {
  let resolver: AppResolver;
  let appService: Pick<AppService, 'getHello'>;

  beforeEach(() => {
    appService = {
      getHello: jest.fn().mockResolvedValue('Hello World!'),
    };

    resolver = new AppResolver(appService as AppService);
  });

  it('should return "Hello World!"', async () => {
    await expect(resolver.getHello()).resolves.toBe('Hello World!');
    expect(appService.getHello).toHaveBeenCalledTimes(1);
  });
});
