import {Controller} from '@nestjs/common';
import {UserControllerBase} from '../generated/user/user.controller.base';
import {UserService} from './user.service';
import {CreateUserRequestDto, GetUsersResponseDto, UpdateUserRequestDto, UserDto} from "src/generated/user/user.dto";

@Controller()
export class UserController extends UserControllerBase {

    constructor(private readonly userService: UserService) {
        super();
    }

    getUsers(limit?: number, page?: number): Promise<GetUsersResponseDto> {
        return this.userService.getUsers(page, limit);
    }

    createUser(body: CreateUserRequestDto): Promise<UserDto> {
        return this.userService.createUser(body);
    }

    getUserById(userId: string): Promise<UserDto> {
        return this.userService.getUserById(userId);
    }

    updateUser(userId: string, body: UpdateUserRequestDto): Promise<UserDto> {
        return this.userService.updateUser(userId, body);
    }

    deleteUser(userId: string): Promise<void> {
        return this.userService.deleteUser(userId);
    }

}