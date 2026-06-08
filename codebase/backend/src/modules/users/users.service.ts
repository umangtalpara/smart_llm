import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(userDto: Partial<User>): Promise<UserDocument> {
    const existingUser = await this.usersRepository.findByEmail(userDto.email!);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
    return await this.usersRepository.create(userDto);
  }

  async findByEmail(email: string): Promise<UserDocument> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string, updates: Partial<User>): Promise<UserDocument> {
    const user = await this.usersRepository.update(id, updates);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
}
