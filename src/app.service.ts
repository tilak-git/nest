import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHelloService() {
    return {
      status: true,
      message: 'Hello World!',
    };
  }
}
