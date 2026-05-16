import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  email: string;
  name: string;
  createdAt: Date;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
