import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { VendorsService } from "./vendors.service";
import { CreateVendorDto, UpdateVendorDto } from "./dto";

@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorsService.create(createVendorDto);
  }

  @Get()
  async findAll() {
    return this.vendorsService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.vendorsService.findOne(id);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(id, updateVendorDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    return this.vendorsService.remove(id);
  }

  @Get(":id/licenses")
  async getLicenses(@Param("id") id: string) {
    return this.vendorsService.getLicenses(id);
  }
}
