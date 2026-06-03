const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { createNotification } = require("../services/notificationService");
const { normalizeEmail, normalizePhone } = require("../utils/normalize");
const { validateActiveSkillCodes } = require("../services/skillService");

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

const stringifyDays = (days) =>
  days === undefined || days === null
    ? undefined
    : Array.isArray(days)
      ? JSON.stringify(days)
      : days;

const parseBool = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const getAgent = async (userId) => {
  const agent = await prisma.agent.findUnique({ where: { userId } });
  if (!agent) throw new ApiError(403, "Agent profile required");
  return agent;
};

/** AGENT: scoped to own servants. ADMIN: full access (no agent profile required). */
const resolveAgentScope = async (user) => {
  if (user.role === "ADMIN") {
    return { isAdmin: true, agent: null, agentId: null };
  }
  const agent = await getAgent(user.id);
  return { isAdmin: false, agent, agentId: agent.id };
};

const servantWhereForScope = (scope, extra = {}) => {
  if (scope.isAdmin) return { ...extra };
  return { agentId: scope.agentId, ...extra };
};

const servantInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
  skills: true,
  zones: true
};

exports.createServant = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  const assignAgentId = scope.isAdmin
    ? req.body.agentId
      ? parseInt(req.body.agentId, 10)
      : null
    : scope.agentId;
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
    weekOffDays,
    hoursPerDay,
    availabilityNotes,
    offersSession,
    offersMonthly,
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

  if (!req.files?.profilePhoto?.[0]) {
    throw new ApiError(400, "Profile photo is required");
  }
  if (!req.files?.idProof?.[0]) {
    throw new ApiError(400, "ID proof document is required");
  }

  const profilePhoto = `/uploads/${req.files.profilePhoto[0].filename}`;
  const idProofUrl = `/uploads/${req.files.idProof[0].filename}`;

  const skillList = await validateActiveSkillCodes(parseSkills(skills));
  const hashed = await bcrypt.hash(password, 12);

  const wd = stringifyDays(workingDays);
  const wod = stringifyDays(weekOffDays);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashed,
      role: "SERVANT",
      servant: {
        create: {
          agentId: assignAgentId,
          bio,
          experience: experience ? parseInt(experience, 10) : null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          monthlyRate: monthlyRate ? parseFloat(monthlyRate) : null,
          availableFrom,
          availableTo,
          workingDays: wd,
          weekOffDays: wod,
          hoursPerDay: hoursPerDay ? parseFloat(hoursPerDay) : null,
          availabilityNotes: availabilityNotes || null,
          offersSession: parseBool(offersSession, true),
          offersMonthly: parseBool(offersMonthly, true),
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
  const scope = await resolveAgentScope(req.user);
  const { status, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

  const where = servantWhereForScope(scope, {
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
  });

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
  const scope = await resolveAgentScope(req.user);
  const id = parseInt(req.params.id, 10);

  const servant = await prisma.servant.findFirst({
    where: servantWhereForScope(scope, { id }),
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
  const scope = await resolveAgentScope(req.user);
  const id = parseInt(req.params.id, 10);

  const existing = await prisma.servant.findFirst({
    where: servantWhereForScope(scope, { id }),
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
    weekOffDays,
    hoursPerDay,
    availabilityNotes,
    offersSession,
    offersMonthly,
    skills
  } = req.body;

  const phone = rawPhone !== undefined ? normalizePhone(rawPhone) : undefined;

  if (phone) {
    const phoneTaken = await prisma.user.findFirst({
      where: { phone, id: { not: existing.userId } }
    });
    if (phoneTaken) throw new ApiError(400, "Phone number already registered");
  }

  const skillList = skills ? await validateActiveSkillCodes(parseSkills(skills)) : null;

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
          workingDays: stringifyDays(workingDays)
        }),
        ...(weekOffDays !== undefined && {
          weekOffDays: stringifyDays(weekOffDays)
        }),
        ...(hoursPerDay !== undefined && {
          hoursPerDay: hoursPerDay === '' ? null : parseFloat(hoursPerDay)
        }),
        ...(availabilityNotes !== undefined && {
          availabilityNotes: availabilityNotes || null
        }),
        ...(offersSession !== undefined && {
          offersSession: parseBool(offersSession, true)
        }),
        ...(offersMonthly !== undefined && {
          offersMonthly: parseBool(offersMonthly, true)
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
  const scope = await resolveAgentScope(req.user);
  const id = parseInt(req.params.id, 10);
  const { status, reason } = req.body;

  const existing = await prisma.servant.findFirst({
    where: servantWhereForScope(scope, { id }),
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
  const scope = await resolveAgentScope(req.user);
  const id = parseInt(req.params.id, 10);

  if (!req.file) throw new ApiError(400, "No file uploaded");

  const existing = await prisma.servant.findFirst({
    where: servantWhereForScope(scope, { id })
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
