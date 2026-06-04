import { Role } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role: Role
    profilePicture?: string | null
    departmentId?: string | null
    divisionId?: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      profilePicture?: string | null
      departmentId?: string | null
      divisionId?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    profilePicture?: string | null
    departmentId?: string | null
    divisionId?: string | null
  }
}
