const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { createNotification } = require("../services/notificationService");
const { normalizeEmail, normalizePhone } = require("../utils/normalize");

const parseSkills = (skills) => {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  try {
    return JSON.parse(skills);
  } catch {
    return String(skills)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
};

const getAgent = async (userId) => {
  const agent = await prisma.agent.findUnique({ where: { userId } });
  if (!agent) throw new ApiError(403, "Agent profile required");
  return agent;
};

const servantInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
  skills: true,
  zones: true
};

exports.createServant = async (req, res) => {
  const agent = await getAgent(req.user.id);
  const {
    name,
    email: rawEmail,
    phone: rawPhone,
    password,
    bio,
    experience,
    hourlyRate,
    monthlyRate,
    availableFrom,
    availableTo,
    workingDays,
    idProofType,
    skills
  } = req.body;

  const email = normalizeEmail(rawEmail);
  const phone = normalizePhone(rawPhone);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(400, "Email already registered");

  if (phone) {
    const phoneTaken = await prisma.user.findFirst({ where: { phone } });
    if (phoneTaken) throw new ApiError(400, "Phone number already registered");
  }

  const profilePhoto = req.files?.profilePhoto?.[0]
    ? `/uploads/${req.files.profilePhoto[0].filename}`
    : req.body.profilePhoto;

  const idProofUrl = req.files?.idProof?.[0]
    ? `/uploads/${req.files.idProof[0].filename}`
    : req.body.idProofUrl;

  const skillList = parseSkills(skills);
  const hashed = await bcrypt.hash(password, 12);

  const wd = Array.isArray(workingDays)
    ? JSON.stringify(workingDays)
    : workingDays;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashed,
      role: "SERVANT",
      servant: {
        create: {
          agentId: agent.id,
          bio,
          experience: experience ? parseInt(experience, 10) : null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          monthlyRate: monthlyRate ? parseFloat(monthlyRate) : null,
          availableFrom,
          availableTo,
          workingDays: wd,
          idProofType,
          idProofUrl,
          profilePhoto,
          verificationStatus: "PENDING",
          skills: {
            create: skillList.map((skillName) => ({ skillName }))
          }
        }
      }
    },
    include: { servant: { include: servantInclude } }
  });

  sendSuccess(res, { servant: user.servant }, 201);
};

exports.listServants = async (req, res) => {
  const agent = await getAgent(req.user.id);
  const { status, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

  const where = {
    agentId: agent.id,
    ...(status ? { verificationStatus: status } : {}),
    ...(search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } }
            ]
          }
        }
      : {})
  };

  const [servants, total] = await Promise.all([
    prisma.servant.findMany({
      where,
      include: servantInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.servant.count({ where })
  ]);

  sendSuccess(res, { servants, pagination: { page, limit, total } });
};

exports.getServant = async (req, res) => {
  const agent = await getAgent(req.user.id);
  const id = parseInt(req.params.id, 10);

  const servant = await prisma.servant.findFirst({
    where: { id, agentId: agent.id },
    include: {
      ...servantInclude,
      bookings: {
        include: {
          houseOwner: { include: { user: { select: { name: true } } } }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  if (!servant) throw new ApiError(404, "Servant not found");
  sendSuccess(res, { servant });
};

exports.updateServant = async (req, res) => {
  const agent = await getAgent(req.user.id);
  const id = parseInt(req.params.id, 10);

  const existing = await prisma.servant.findFirst({
    where: { id, agentId: agent.id },
    include: { user: true }
  });
  if (!existing) throw new ApiError(404, "Servant not found");

  const {
    name,
    phone: rawPhone,
    bio,
    experience,
    hourlyRate,
    monthlyRate,
    availableFrom,
    availableTo,
    workingDays,
    skills
  } = req.body;

  const phone = rawPhone !== undefined ? normalizePhone(rawPhone) : undefined;

  if (phone) {
    const phoneTaken = await prisma.user.findFirst({
      where: { phone, id: { not: existing.userId } }
    });
    if (phoneTaken) throw new ApiError(400, "Phone number already registered");
  }

  const skillList = skills ? parseSkills(skills) : null;

  const profilePhoto = req.files?.profilePhoto?.[0]
    ? `/uploads/${req.files.profilePhoto[0].filename}`
    : undefined;

  const idProofUrl = req.files?.idProof?.[0]
    ? `/uploads/${req.files.idProof[0].filename}`
    : undefined;

  const servant = await prisma.$transaction(async (tx) => {
    if (name || phone !== undefined) {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone })
        }
      });
    }

    if (skillList) {
      await tx.servantSkill.deleteMany({ where: { servantId: id } });
      await tx.servantSkill.createMany({
        data: skillList.map((skillName) => ({ servantId: id, skillName }))
      });
    }

    return tx.servant.update({
      where: { id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(experience !== undefined && { experience: parseInt(experience, 10) }),
        ...(hourlyRate !== undefined && { hourlyRate: parseFloat(hourlyRate) }),
        ...(monthlyRate !== undefined && { monthlyRate: parseFloat(monthlyRate) }),
        ...(availableFrom !== undefined && { availableFrom }),
        ...(availableTo !== undefined && { availableTo }),
        ...(workingDays !== undefined && {
          workingDays: Array.isArray(workingDays)
            ? JSON.stringify(workingDays)
            : workingDays
        }),
        ...(profilePhoto && { profilePhoto }),
        ...(idProofUrl && { idProofUrl }),
        ...(req.body.idProofType && { idProofType: req.body.idProofType })
      },
      include: servantInclude
    });
  });

  sendSuccess(res, { servant });
};

exports.verifyServant = async (req, res) => {
  const agent = await getAgent(req.user.id);
  const id = parseInt(req.params.id, 10);
  const { status, reason } = req.body;

  const existing = await prisma.servant.findFirst({
    where: { id, agentId: agent.id },
    include: { user: true }
  });
  if (!existing) throw new ApiError(404, "Servant not found");

  const servant = await prisma.servant.update({
    where: { id },
    data: {
      verificationStatus: status,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      rejectionReason: status === "REJECTED" ? reason : null
    },
    include: servantInclude
  });

  if (status === "VERIFIED") {
    await createNotification({
      userId: existing.userId,
      title: "Profile verified",
      body: "Your servant profile has been verified",
      type: "SERVANT_VERIFIED",
      data: { servantId: id }
    });
  }

  sendSuccess(res, { servant });
};

exports.uploadIdProof = async (req, res) => {
  const agent = await getAgent(req.user.id);
  const id = parseInt(req.params.id, 10);

  if (!req.file) throw new ApiError(400, "No file uploaded");

  const existing = await prisma.servant.findFirst({
    where: { id, agentId: agent.id }
  });
  if (!existing) throw new ApiError(404, "Servant not found");

  const idProofUrl = `/uploads/${req.file.filename}`;
  const servant = await prisma.servant.update({
    where: { id },
    data: { idProofUrl },
    include: servantInclude
  });

  sendSuccess(res, { servant });
};
