import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

@Module({
  imports: [
    RouterModule.register([
      {
        path: 'app',
        children: [],
      },
    ]),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
