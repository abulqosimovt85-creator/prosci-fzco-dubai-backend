import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly adminUsername: string;
  private readonly adminPasswordHash: string;

  constructor(private readonly jwtService: JwtService) {
    this.adminUsername = process.env.ADMIN_USERNAME || 'admin';

    const plainPassword = process.env.ADMIN_PASSWORD || 'changeme';
    const storedHash = process.env.ADMIN_PASSWORD_HASH;

    if (storedHash) {
      this.adminPasswordHash = storedHash;
    } else {
      this.adminPasswordHash = bcrypt.hashSync(plainPassword, 10);
      console.warn(
        '[Auth] No ADMIN_PASSWORD_HASH set. Using hashed ADMIN_PASSWORD. ' +
        'For production, set ADMIN_PASSWORD_HASH in your env.',
      );
    }
  }

  async validateUser(username: string, password: string): Promise<{ username: string }> {
    if (username !== this.adminUsername) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, this.adminPasswordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { username: this.adminUsername };
  }

  login(user: { username: string }): { access_token: string } {
    const payload = { sub: user.username, role: 'admin' };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
