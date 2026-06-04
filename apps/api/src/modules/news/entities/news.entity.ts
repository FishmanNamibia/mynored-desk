export class News {
  id!: string;
  title!: string;
  content!: string;
  authorId!: string;
  imageUrl?: string;
  excerpt?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
