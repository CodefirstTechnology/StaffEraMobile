const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { processOfflineAadhaarZip } = require("../services/aadhaarXmlService");
const { assertAgentCanAccessServant } = require("../services/agentRegistrationService");
const { getRoleCode } = require("../services/roleService");

const servantKycSelect = {
  id: true,
  aadhaarVerified: true,
  aadhaarVerificationType: true,
  aadhaarVerifiedAt: true,
  aadhaarVerifiedName: true,
  aadhaarVerifiedDob: true,
  aadhaarVerifiedGender: true,
  aadhaarVerifiedAddress: true,
  aadhaarPhotoUrl: true,
  aadhaarReferenceId: true,
  aadhaarNameMatch: true,
  phoneVerified: true,
  verificationStatus: true,
  user: { select: { id: true, name: true, phone: true } }
};

const resolveAgentScope = async (user) => {
  if (getRoleCode(user) === "ADMIN") {
    return { isAdmin: true, agentId: null, agent: null };
  }
  const agent = await prisma.agent.findUnique({ where: { userId: user.id } });
  if (!agent) throw new ApiError(403, "Agent profile required");
  return { isAdmin: false, agentId: agent.id, agent };
};

const assertServantAccess = async (req, servant) => {
  if (!servant) throw new ApiError(404, "Servant profile not found");
  const role = getRoleCode(req.user);
  if (role === "SERVANT") {
    if (servant.userId !== req.user.id) throw new ApiError(403, "Forbidden");
    return;
  }
  if (role === "AGENT" || role === "ADMIN") {
    const scope = await resolveAgentScope(req.user);
    if (!scope.isAdmin && scope.agentId) {
      const agent =
        scope.agent || (await prisma.agent.findUnique({ where: { id: scope.agentId } }));
      assertAgentCanAccessServant(scope, servant, agent);
    }
    return;
  }
  throw new ApiError(403, "Forbidden");
};

const applyAadhaarVerification = async (servant, result) => {
  const updated = await prisma.servant.update({
    where: { id: servant.id },
    data: {
      aadhaarVerified: true,
      aadhaarVerificationType: "UIDAI_XML",
      aadhaarVerifiedAt: new Date(),
      aadhaarVerifiedName: result.name,
      aadhaarVerifiedDob: result.dob,
      aadhaarVerifiedGender: result.genderLabel || result.gender,
      aadhaarVerifiedAddress: result.address,
      aadhaarPhotoUrl: result.photoUrl,
      aadhaarReferenceId: result.referenceId,
      aadhaarNameMatch: result.nameMatch,
      idProofType: "AADHAR",
      ...(result.photoUrl ? { profilePhoto: result.photoUrl } : {})
    },
    select: servantKycSelect
  });
  return updated;
};

exports.verifyAadhaarXmlForMe = async (req, res) => {
  const shareCode = String(req.body.shareCode || "").trim();
  if (!req.file?.buffer) throw new ApiError(400, "Aadhaar ZIP file is required");

  const servant = await prisma.servant.findUnique({
    where: { userId: req.user.id },
    include: { user: true }
  });
  if (!servant) throw new ApiError(404, "Servant profile not found");

  let result;
  try {
    result = await processOfflineAadhaarZip({
      zipBuffer: req.file.buffer,
      shareCode,
      expectedName: servant.user.name
    });
  } catch (err) {
    throw new ApiError(400, err.message || "Invalid Aadhaar XML");
  }

  const servantUpdated = await applyAadhaarVerification(servant, result);

  sendSuccess(res, {
    message: "Aadhaar verified successfully",
    verification: {
      verified: true,
      type: "UIDAI_XML",
      name: result.name,
      dob: result.dob,
      gender: result.genderLabel,
      address: result.address,
      referenceId: result.referenceId,
      nameMatch: result.nameMatch,
      nameMatchScore: result.nameMatchScore
    },
    servant: servantUpdated
  });
};

exports.verifyAadhaarXmlForServant = async (req, res) => {
  const servantId = parseInt(req.params.id, 10);
  const shareCode = String(req.body.shareCode || "").trim();
  if (!req.file?.buffer) throw new ApiError(400, "Aadhaar ZIP file is required");

  const servant = await prisma.servant.findUnique({
    where: { id: servantId },
    include: { user: true }
  });
  await assertServantAccess(req, servant);

  let result;
  try {
    result = await processOfflineAadhaarZip({
      zipBuffer: req.file.buffer,
      shareCode,
      expectedName: servant.user.name
    });
  } catch (err) {
    throw new ApiError(400, err.message || "Invalid Aadhaar XML");
  }

  const servantUpdated = await applyAadhaarVerification(servant, result);

  sendSuccess(res, {
    message: "Aadhaar verified successfully",
    verification: {
      verified: true,
      type: "UIDAI_XML",
      name: result.name,
      dob: result.dob,
      gender: result.genderLabel,
      address: result.address,
      referenceId: result.referenceId,
      nameMatch: result.nameMatch,
      nameMatchScore: result.nameMatchScore
    },
    servant: servantUpdated
  });
};

exports.getAadhaarStatus = async (req, res) => {
  const servantId = parseInt(req.params.id, 10);
  const servant = await prisma.servant.findUnique({
    where: { id: servantId },
    select: servantKycSelect
  });
  await assertServantAccess(req, servant);

  sendSuccess(res, {
    aadhaar: {
      verified: servant.aadhaarVerified,
      type: servant.aadhaarVerificationType,
      verifiedAt: servant.aadhaarVerifiedAt,
      name: servant.aadhaarVerifiedName,
      dob: servant.aadhaarVerifiedDob,
      gender: servant.aadhaarVerifiedGender,
      address: servant.aadhaarVerifiedAddress,
      photoUrl: servant.aadhaarPhotoUrl,
      referenceId: servant.aadhaarReferenceId,
      nameMatch: servant.aadhaarNameMatch
    },
    phoneVerified: servant.phoneVerified,
    verificationStatus: servant.verificationStatus
  });
};

exports.getMyAadhaarStatus = async (req, res) => {
  const servant = await prisma.servant.findUnique({
    where: { userId: req.user.id },
    select: servantKycSelect
  });
  if (!servant) throw new ApiError(404, "Servant profile not found");

  sendSuccess(res, {
    aadhaar: {
      verified: servant.aadhaarVerified,
      type: servant.aadhaarVerificationType,
      verifiedAt: servant.aadhaarVerifiedAt,
      name: servant.aadhaarVerifiedName,
      dob: servant.aadhaarVerifiedDob,
      gender: servant.aadhaarVerifiedGender,
      address: servant.aadhaarVerifiedAddress,
      photoUrl: servant.aadhaarPhotoUrl,
      referenceId: servant.aadhaarReferenceId,
      nameMatch: servant.aadhaarNameMatch
    },
    phoneVerified: servant.phoneVerified,
    verificationStatus: servant.verificationStatus
  });
};
