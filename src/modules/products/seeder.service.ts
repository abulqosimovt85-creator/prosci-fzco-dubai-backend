import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  async onApplicationBootstrap() {
    console.log('[Seeder] Seeding disabled. Ready for real data.');
  }
}
