import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiService {
  getHelloService() {
    return 'Hello World!';
  }
}
