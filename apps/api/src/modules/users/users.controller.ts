import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtGuard } from "../auth/guards/jwt.guard";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtGuard)
  findAll(
    @Query("search") search?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    return this.usersService.findAll({
      search,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Get("executives")
  @UseGuards(JwtGuard)
  findExecutives() {
    return this.usersService.findExecutives();
  }

  @Get(":id")
  @UseGuards(JwtGuard)
  findOne(@Param("id") id: string) {
    return this.usersService.findById(id);
  }
}
