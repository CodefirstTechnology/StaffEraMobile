const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");

exports.listNotifications = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const isAll = req.query.limit === "all";
  const limit = isAll ? undefined : Math.min(100, parseInt(req.query.limit, 10) || 20);
  const where = { userId: req.user.id };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(limit ? { skip: (page - 1) * limit, take: limit } : {})
    }),
    prisma.notification.count({ where })
  ]);

  const activeLimit = limit || total || 1;
  const totalPages = Math.ceil(total / activeLimit) || 1;

  sendSuccess(res, {
    notifications,
    pagination: { page, limit: activeLimit, total, totalPages }
  });
};

exports.markRead = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const notification = await prisma.notification.findFirst({
    where: { id, userId: req.user.id }
  });
  if (!notification) throw new ApiError(404, "Notification not found");

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });

  sendSuccess(res, { notification: updated });
};

exports.markAllRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true }
  });

  sendSuccess(res, { message: "All notifications marked as read" });
};
