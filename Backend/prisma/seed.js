const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("StaffEra@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@staffera.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@staffera.com",
      password,
      role: "ADMIN"
    }
  });

  const agentUser = await prisma.user.upsert({
    where: { email: "agent@staffera.com" },
    update: {},
    create: {
      name: "Demo Agent",
      email: "agent@staffera.com",
      phone: "9000000001",
      password,
      role: "AGENT",
      agent: {
        create: { agencyName: "StaffEra Agency", city: "Mumbai" }
      }
    },
    include: { agent: true }
  });

  console.log("Seed complete:");
  console.log("  Admin: admin@staffera.com / StaffEra@123");
  console.log("  Agent: agent@staffera.com / StaffEra@123");
  console.log("  Register house owners via POST /api/v1/auth/register-owner");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
