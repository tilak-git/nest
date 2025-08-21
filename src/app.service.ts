import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHelloService() {
    return 'Hello World!';
  }
}
