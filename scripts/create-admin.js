require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { withAccelerate } = require("@prisma/extension-accelerate");
const bcrypt = require("bcryptjs");

const accelerateUrl = process.env.DATABASE_URL;

if (!accelerateUrl) {
  throw new Error("DATABASE_URL ortam değişkeni zorunlu.");
}

const prisma = new PrismaClient({
  accelerateUrl
}).$extends(withAccelerate());

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Online Dershanem Admin";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL ve ADMIN_PASSWORD ortam değişkenleri zorunlu.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: {
      email
    },
    update: {
      name,
      passwordHash,
      role: "ADMIN"
    },
    create: {
      email,
      name,
      passwordHash,
      role: "ADMIN"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Admin hesabı oluşturuldu veya güncellendi.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error(error);
    process.exit(1);
  });
