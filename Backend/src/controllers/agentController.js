const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { createNotification } = require("../services/notificationService");
const { normalizeEmail, normalizePhone } = require("../utils/normalize");
const { validateActiveSkillCodes } = require("../services/skillService");
const {
  ROLE_IDS,
  getRoleCode,
  serializeUser,
  userWithRoleInclude
} = require("../services/roleService");
const {
  agentHasLocation,
  boundingBoxForRadius,
  getAgentRadiusKm,
  filterServantsNearAgent
} = require("../services/locationService");
const { assertAgentCanAccessServant } = require("../services/agentRegistrationService");
const { getAgentAnnualRevenue } = require("../services/agentRevenueService");

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

const generateServantPassword = () => {
  const part = crypto.randomBytes(4).toString("hex");
  return `St${part}1`;
};

const getAgent = async (userId) => {
  const agent = await prisma.agent.findUnique({ where: { userId } });
  if (!agent) throw new ApiError(403, "Agent profile required");
  return agent;
};

/** AGENT: scoped to own servants. ADMIN: full access (no agent profile required). */
const resolveAgentScope = async (user) => {
  if (getRoleCode(user) === "ADMIN") {
    return { isAdmin: true, agent: null, agentId: null };
  }
  const agent = await getAgent(user.id);
  return { isAdmin: false, agent, agentId: agent.id };
};

/** Agent onboarded / assigned staff (not pending app sign-ups). */
const servantWhereForScope = (scope, extra = {}) => {
  if (scope.isAdmin) return { ...extra };
  return {
    AND: [
      { agentId: scope.agentId, registrationSource: "AGENT" },
      ...(Object.keys(extra).length ? [extra] : [])
    ]
  };
};

/** Pending sign-ups from the Servant app — separate from the servants pipeline. */
const registrationWhereForScope = (scope, extra = {}) => {
  const base = { registrationSource: "SELF", agentId: null };
  if (scope.isAdmin) return { ...base, ...extra };
  return { ...base, ...extra };
};

/** Single-record access: assigned servants or unassigned app registration. */
const recordWhereForScope = (scope, extra = {}) => {
  if (scope.isAdmin) return { ...extra };
  return {
    AND: [
      {
        OR: [
          { agentId: scope.agentId, registrationSource: "AGENT" },
          { registrationSource: "SELF", agentId: null }
        ]
      },
      ...(Object.keys(extra).length ? [extra] : [])
    ]
  };
};

const assertAgentLocationSet = async (agentId) => {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (
    !agent?.address?.trim() ||
    agent.latitude == null ||
    agent.longitude == null
  ) {
    throw new ApiError(
      400,
      "Set your agency location in Profile settings before onboarding servants"
    );
  }
};

const servantInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      agentSetPassword: true
    }
  },
  skills: true,
  zones: true
};

const applyAppRegistrationPassword = async (userId, email, plainPassword) => {
  const hash = await bcrypt.hash(plainPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash, agentSetPassword: true }
  });
  return { email, password: plainPassword };
};

exports.createServant = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  if (!scope.isAdmin && scope.agentId) {
    await assertAgentLocationSet(scope.agentId);
  }
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
    skills,
    address,
    city,
    latitude,
    longitude,
    bankAccountHolder,
    bankAccountNumber,
    bankName,
    bankIfsc,
    bankUpiId
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
      roleId: ROLE_IDS.SERVANT,
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
          registrationSource: "AGENT",
          phoneVerified: !!phone,
          address: address?.trim() || null,
          city: city?.trim() || null,
          latitude: latitude !== undefined && latitude !== "" ? parseFloat(latitude) : null,
          longitude: longitude !== undefined && longitude !== "" ? parseFloat(longitude) : null,
          bankAccountHolder: bankAccountHolder?.trim() || null,
          bankAccountNumber: bankAccountNumber?.trim() || null,
          bankName: bankName?.trim() || null,
          bankIfsc: bankIfsc?.trim()?.toUpperCase() || null,
          bankUpiId: bankUpiId?.trim() || null,
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
  const { status, search, category } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

  const categoryKey = String(category || "").toLowerCase();
  const isRegistrationList =
    categoryKey === "registered" || categoryKey === "app" || categoryKey === "self";

  const sharedFilters = {
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

  let where = isRegistrationList
    ? registrationWhereForScope(scope, sharedFilters)
    : servantWhereForScope(scope, {
        ...(categoryKey === "mine" && scope.agentId ? { agentId: scope.agentId } : {}),
        ...sharedFilters
      });

  let locationNotice = null;

  if (isRegistrationList && !scope.isAdmin && scope.agentId) {
    const agent = scope.agent || (await prisma.agent.findUnique({ where: { id: scope.agentId } }));
    const agentRadiusKm = getAgentRadiusKm(agent);

    if (!agentHasLocation(agent)) {
      return sendSuccess(res, {
        servants: [],
        pagination: { page, limit, total: 0 },
        locationNotice:
          `Set your agency location in Profile to receive registrations within ${agentRadiusKm} km.`
      });
    }

    const box = boundingBoxForRadius(agent.latitude, agent.longitude, agentRadiusKm);
    where = registrationWhereForScope(scope, {
      ...sharedFilters,
      ...box
    });

    const candidates = await prisma.servant.findMany({
      where,
      include: servantInclude,
      orderBy: { createdAt: "desc" }
    });

    const filtered = filterServantsNearAgent(candidates, agent, agentRadiusKm);
    const total = filtered.length;
    const servants = filtered.slice((page - 1) * limit, page * limit);

    return sendSuccess(res, {
      servants,
      pagination: { page, limit, total },
      locationNotice: `Showing registrations within ${agentRadiusKm} km of your agency.`
    });
  }

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

  sendSuccess(res, {
    servants,
    pagination: { page, limit, total },
    ...(locationNotice ? { locationNotice } : {})
  });
};

const assertScopedServantAccess = async (scope, servant) => {
  if (!servant) throw new ApiError(404, "Servant not found");
  if (!scope.isAdmin && scope.agentId) {
    const agent =
      scope.agent || (await prisma.agent.findUnique({ where: { id: scope.agentId } }));
    assertAgentCanAccessServant(scope, servant, agent);
  }
};

exports.getServant = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  const id = parseInt(req.params.id, 10);

  const servant = await prisma.servant.findFirst({
    where: recordWhereForScope(scope, { id }),
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

  await assertScopedServantAccess(scope, servant);
  sendSuccess(res, { servant });
};

exports.updateServant = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  const id = parseInt(req.params.id, 10);

  const existing = await prisma.servant.findFirst({
    where: recordWhereForScope(scope, { id }),
    include: { user: true }
  });
  await assertScopedServantAccess(scope, existing);

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
    skills,
    address,
    city,
    latitude,
    longitude,
    bankAccountHolder,
    bankAccountNumber,
    bankName,
    bankIfsc,
    bankUpiId,
    password,
    generatePassword
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

  const isAppRegistration =
    existing.registrationSource === "SELF" || existing.user.isActive === false;

  let loginPassword =
    password && String(password).trim().length >= 6 ? String(password).trim() : null;
  if (isAppRegistration && generatePassword && !loginPassword) {
    loginPassword = generateServantPassword();
  }
  if (password && String(password).trim().length > 0 && String(password).trim().length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  let credentials = null;

  const servant = await prisma.$transaction(async (tx) => {
    const userPatch = {
      ...(name && { name }),
      ...(phone !== undefined && { phone })
    };
    if (loginPassword && isAppRegistration) {
      userPatch.password = await bcrypt.hash(loginPassword, 12);
      userPatch.agentSetPassword = true;
      credentials = {
        email: existing.user.email,
        password: loginPassword
      };
    }
    if (Object.keys(userPatch).length > 0) {
      await tx.user.update({
        where: { id: existing.userId },
        data: userPatch
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
        ...(req.body.idProofType && { idProofType: req.body.idProofType }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(latitude !== undefined && {
          latitude: latitude === "" ? null : parseFloat(latitude)
        }),
        ...(longitude !== undefined && {
          longitude: longitude === "" ? null : parseFloat(longitude)
        }),
        ...(bankAccountHolder !== undefined && {
          bankAccountHolder: bankAccountHolder?.trim() || null
        }),
        ...(bankAccountNumber !== undefined && {
          bankAccountNumber: bankAccountNumber?.trim() || null
        }),
        ...(bankName !== undefined && { bankName: bankName?.trim() || null }),
        ...(bankIfsc !== undefined && {
          bankIfsc: bankIfsc?.trim() ? bankIfsc.trim().toUpperCase() : null
        }),
        ...(bankUpiId !== undefined && { bankUpiId: bankUpiId?.trim() || null })
      },
      include: servantInclude
    });
  });

  sendSuccess(res, { servant, ...(credentials ? { credentials } : {}) });
};

exports.setServantPassword = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  const id = parseInt(req.params.id, 10);
  const { password, generatePassword } = req.body;

  const existing = await prisma.servant.findFirst({
    where: recordWhereForScope(scope, { id }),
    include: { user: true }
  });
  await assertScopedServantAccess(scope, existing);

  const isAppRegistration =
    existing.registrationSource === "SELF" || existing.user.isActive === false;

  if (!isAppRegistration) {
    throw new ApiError(400, "Login password can only be set for app registrations");
  }

  let loginPassword =
    password && String(password).trim().length >= 6 ? String(password).trim() : null;
  if (generatePassword && !loginPassword) {
    loginPassword = generateServantPassword();
  }
  if (!loginPassword) {
    throw new ApiError(400, "Provide a password (min 6 characters) or use generate password");
  }

  const credentials = await applyAppRegistrationPassword(
    existing.userId,
    existing.user.email,
    loginPassword
  );

  const servant = await prisma.servant.findFirst({
    where: { id },
    include: servantInclude
  });

  sendSuccess(res, {
    servant,
    credentials,
    message: "Login password saved. Share these details with the helper, then approve their profile."
  });
};

exports.verifyServant = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  const id = parseInt(req.params.id, 10);
  const { status, reason, password, generatePassword } = req.body;

  const existing = await prisma.servant.findFirst({
    where: recordWhereForScope(scope, { id }),
    include: { user: true }
  });
  await assertScopedServantAccess(scope, existing);

  const isAppRegistration =
    existing.registrationSource === "SELF" || existing.user.isActive === false;

  let loginPassword =
    password && String(password).trim().length >= 6 ? String(password).trim() : null;

  if (
    status === "VERIFIED" &&
    !existing.aadhaarVerified &&
    process.env.REQUIRE_AADHAAR_VERIFICATION !== "false"
  ) {
    throw new ApiError(
      400,
      "Aadhaar Offline XML verification is required before approving this servant"
    );
  }

  if (status === "VERIFIED" && isAppRegistration) {
    if (!loginPassword && generatePassword) {
      loginPassword = generateServantPassword();
    }
    if (!loginPassword && !existing.user.agentSetPassword) {
      throw new ApiError(
        400,
        "Set a login password first (min 6 characters), or use generate password when approving"
      );
    }
  } else if (status === "VERIFIED" && password && String(password).length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters when setting login");
  }

  const servant = await prisma.servant.update({
    where: { id },
    data: {
      verificationStatus: status,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      rejectionReason: status === "REJECTED" ? reason : null,
      ...(status === "VERIFIED" && isAppRegistration && scope.agentId
        ? { agentId: scope.agentId, registrationSource: "AGENT" }
        : {})
    },
    include: servantInclude
  });

  let credentials = null;

  if (status === "VERIFIED") {
    const userData = { isActive: true };
    if (loginPassword) {
      userData.password = await bcrypt.hash(loginPassword, 12);
      userData.agentSetPassword = true;
      credentials = {
        email: existing.user.email,
        password: loginPassword
      };
    }
    await prisma.user.update({
      where: { id: existing.userId },
      data: userData
    });
    await createNotification({
      userId: existing.userId,
      title: "Profile verified",
      body: loginPassword
        ? "Your profile is verified. Use the email and password your agent shared to sign in."
        : "Your servant profile has been verified",
      type: "SERVANT_VERIFIED",
      data: { servantId: id }
    });
  }

  sendSuccess(res, { servant, ...(credentials ? { credentials } : {}) });
};

exports.uploadIdProof = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  const id = parseInt(req.params.id, 10);

  if (!req.file) throw new ApiError(400, "No file uploaded");

  const existing = await prisma.servant.findFirst({
    where: recordWhereForScope(scope, { id })
  });
  await assertScopedServantAccess(scope, existing);

  const idProofUrl = `/uploads/${req.file.filename}`;
  const servant = await prisma.servant.update({
    where: { id },
    data: { idProofUrl },
    include: servantInclude
  });

  sendSuccess(res, { servant });
};

exports.getStats = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  if (scope.isAdmin) {
    throw new ApiError(403, "Sign in as a field agent to view agency revenue");
  }

  const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
  const stats = await getAgentAnnualRevenue(scope.agentId, year);
  sendSuccess(res, stats);
};

exports.updateProfile = async (req, res) => {
  const agent = await prisma.agent.findUnique({
    where: { userId: req.user.id }
  });
  if (!agent) {
    throw new ApiError(404, "Agent profile not found. Contact support to link your agency.");
  }

  const { agencyName, address, city, latitude, longitude, serviceRadiusKm } = req.body;

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: {
      ...(agencyName !== undefined && { agencyName: agencyName?.trim() || null }),
      address: address.trim(),
      city: city?.trim() || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      ...(serviceRadiusKm !== undefined && {
        serviceRadiusKm: parseFloat(serviceRadiusKm)
      })
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      houseOwner: true,
      servant: { include: { skills: true, zones: true } },
      agent: true,
      ...userWithRoleInclude
    }
  });

  sendSuccess(res, { agent: updated, user: serializeUser(user) });
};

const getScopedServant = async (scope, servantId) => {
  const servant = await prisma.servant.findFirst({
    where: recordWhereForScope(scope, { id: servantId })
  });
  await assertScopedServantAccess(scope, servant);
  return servant;
};

const getScopedServantZone = async (scope, servantId, zoneId) => {
  const servant = await getScopedServant(scope, servantId);
  const zone = await prisma.zone.findFirst({
    where: { id: zoneId, servantId: servant.id }
  });
  if (!zone) throw new ApiError(404, "Zone not found");
  return { servant, zone };
};

exports.listServantZones = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  const servantId = parseInt(req.params.id, 10);
  await getScopedServant(scope, servantId);

  const zones = await prisma.zone.findMany({
    where: { servantId },
    orderBy: { name: "asc" }
  });

  sendSuccess(res, { zones });
};

exports.createServantZone = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  const servantId = parseInt(req.params.id, 10);
  await getScopedServant(scope, servantId);

  const { name, description, city, latitude, longitude } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Zone name is required");

  const zone = await prisma.zone.create({
    data: {
      servantId,
      name: name.trim(),
      description: description?.trim() || null,
      city: city?.trim() || null,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined
    }
  });

  sendSuccess(res, { zone }, 201);
};

exports.updateServantZone = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  const servantId = parseInt(req.params.id, 10);
  const zoneId = parseInt(req.params.zoneId, 10);
  await getScopedServantZone(scope, servantId, zoneId);

  const { name, description, city, latitude, longitude } = req.body;
  const zone = await prisma.zone.update({
    where: { id: zoneId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && {
        description: description?.trim() || null
      }),
      ...(city !== undefined && { city: city?.trim() || null }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude })
    }
  });

  sendSuccess(res, { zone });
};

exports.deleteServantZone = async (req, res) => {
  const scope = await resolveAgentScope(req.user);
  const servantId = parseInt(req.params.id, 10);
  const zoneId = parseInt(req.params.zoneId, 10);
  await getScopedServantZone(scope, servantId, zoneId);

  await prisma.zone.delete({ where: { id: zoneId } });
  sendSuccess(res, { message: "Zone deleted" });
};
