import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<Pick<AppService, 'getHello'>>;

  beforeEach(() => {
    appService = {
      getHello: jest.fn().mockResolvedValue('Hello World!'),
    };

    controller = new AppController(appService as unknown as AppService);
  });

  it('delegates to the app service for the root greeting', async () => {
    await expect(controller.getHello()).resolves.toBe('Hello World!');
    expect(appService.getHello).toHaveBeenCalledTimes(1);
  });
});
