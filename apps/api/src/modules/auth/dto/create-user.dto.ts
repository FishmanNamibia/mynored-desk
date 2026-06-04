export class CreateUserDto {
  azureOid!: string;
  email!: string;
  displayName!: string;
  roles!: string[];
}
