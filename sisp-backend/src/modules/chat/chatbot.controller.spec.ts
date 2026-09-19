import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ChatbotController } from './chatbot.controller';

describe('ChatbotController portal access', () => {
  it('limits the normal ARIA endpoints to students', () => {
    const methods = ['sendMessage', 'getHistory', 'getQuota'] as const;

    for (const method of methods) {
      expect(Reflect.getMetadata(ROLES_KEY, ChatbotController.prototype[method])).toEqual(['student']);
    }
  });
});
