import type { DefaultSession } from "next-auth";

type UserRole = "ADMIN" | "STUDENT" | "TEACHER" | "PARENT";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      isAdmin: boolean;
      hasStudentAccess: boolean;
      hasTeacherAccess: boolean;
      hasParentAccess: boolean;
      hasOdAccess: boolean;
      hasOdkAccess: boolean;
    };
  }

  interface User {
    role: UserRole;
    isAdmin?: boolean;
    hasStudentAccess?: boolean;
    hasTeacherAccess?: boolean;
    hasParentAccess?: boolean;
    hasOdAccess?: boolean;
    hasOdkAccess?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    isAdmin?: boolean;
    hasStudentAccess?: boolean;
    hasTeacherAccess?: boolean;
    hasParentAccess?: boolean;
    hasOdAccess?: boolean;
    hasOdkAccess?: boolean;
  }
}
