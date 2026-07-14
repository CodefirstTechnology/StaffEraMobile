require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { seedRoles, ROLE_IDS } = require("../src/services/roleService");

const prisma = new PrismaClient();

async function main() {
  await seedRoles(prisma);

  const password = await bcrypt.hash("StaffEra@123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@staffera.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@staffera.com",
      password,
      roleId: ROLE_IDS.ADMIN,
      agent: {
        create: { agencyName: "StaffEra Admin", city: "Mumbai" }
      }
    },
    include: { agent: true }
  });

  if (!adminUser.agent) {
    await prisma.agent.create({
      data: {
        userId: adminUser.id,
        agencyName: "StaffEra Admin",
        city: "Mumbai"
      }
    });
  }

  const agentUser = await prisma.user.upsert({
    where: { email: "agent@staffera.com" },
    update: {},
    create: {
      name: "Demo Agent",
      email: "agent@staffera.com",
      phone: "9000000001",
      password,
      roleId: ROLE_IDS.AGENT,
      agent: {
        create: { agencyName: "StaffEra Agency", city: "Mumbai" }
      }
    },
    include: { agent: true }
  });

  const defaultSkills = [
    { code: "COOKING", label: "Cooking", sortOrder: 1 },
    { code: "CLEANING", label: "Cleaning", sortOrder: 2 },
    { code: "CHILDCARE", label: "Childcare", sortOrder: 3 },
    { code: "DRIVING", label: "Driving", sortOrder: 4 },
    { code: "LAUNDRY", label: "Laundry", sortOrder: 5 },
    { code: "ELDERLY_CARE", label: "Elderly care", sortOrder: 6 },
    { code: "GARDENING", label: "Gardening", sortOrder: 7 }
  ];

  for (const skill of defaultSkills) {
    await prisma.skill.upsert({
      where: { code: skill.code },
      update: { label: skill.label, sortOrder: skill.sortOrder, isActive: true },
      create: skill
    });
  }

  console.log("Seed complete:");
  console.log("  Admin: admin@staffera.com / StaffEra@123");
  console.log("  Agent: agent@staffera.com / StaffEra@123");
  console.log(`  Skills: ${defaultSkills.length} default skills`);
  console.log("  Register house owners via POST /api/v1/auth/register-owner");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
