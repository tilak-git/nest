import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

import { AuthModule } from '@/modules/admin/auth/auth.module';
import { UserModule } from '@/modules/admin/user/user.module';

@Module({
  imports: [
    RouterModule.register([
      {
        path: 'admin',
        children: [
          {
            path: 'auth',
            module: AuthModule,
          },
          {
            path: 'users',
            module: UserModule,
          },
        ],
      },
    ]),
    AuthModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AdminModule {}
