import { Router } from "express";
import { body, param } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { requireAuth, loadUser } from "../middleware/auth.js";
import { requireProjectMember, requireAdmin } from "../middleware/projectAccess.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth, loadUser);

router.get("/", async (req, res) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.userId },
    include: { project: { include: { _count: { select: { tasks: true, members: true } } } } },
    orderBy: { project: { createdAt: "desc" } },
  });
  res.json({
    projects: memberships.map((m) => ({
      ...m.project,
      role: m.role,
      taskCount: m.project._count.tasks,
      memberCount: m.project._count.members,
    })),
  });
});

router.post(
  "/",
  body("name").trim().isLength({ min: 1, max: 200 }),
  body("description").optional().trim().isLength({ max: 2000 }),
  validate,
  async (req, res) => {
    const project = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          name: req.body.name,
          description: req.body.description || null,
          ownerId: req.userId,
        },
      });
      await tx.projectMember.create({ data: { projectId: p.id, userId: req.userId, role: "ADMIN" } });
      return p;
    });
    res.status(201).json({ project: { ...project, role: "ADMIN" } });
  }
);

router.get("/:projectId", param("projectId").isString().notEmpty(), validate, requireProjectMember, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId },
    include: {
      members: { include: { user: { select: { id: true, email: true, name: true } } } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      role: req.membership.role,
      members: project.members.map((m) => ({ id: m.id, userId: m.userId, role: m.role, user: m.user })),
      taskCount: project._count.tasks,
    },
  });
});

router.patch(
  "/:projectId",
  param("projectId").isString(),
  body("name").optional().trim().isLength({ min: 1, max: 200 }),
  body("description").optional().trim().isLength({ max: 2000 }),
  validate,
  requireProjectMember,
  requireAdmin,
  async (req, res) => {
    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.description !== undefined) data.description = req.body.description;
    const project = await prisma.project.update({ where: { id: req.params.projectId }, data });
    res.json({ project });
  }
);

router.delete("/:projectId", param("projectId").isString(), validate, requireProjectMember, requireAdmin, async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.projectId } });
  res.status(204).send();
});

router.post(
  "/:projectId/members",
  param("projectId").isString(),
  body("email").isEmail().normalizeEmail(),
  body("role").optional().isIn(["ADMIN", "MEMBER"]),
  validate,
  requireProjectMember,
  requireAdmin,
  async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user) return res.status(404).json({ error: "No user with this email. They must sign up first." });

    const role = req.body.role === "ADMIN" ? "ADMIN" : "MEMBER";
    try {
      const member = await prisma.projectMember.create({
        data: { projectId: req.params.projectId, userId: user.id, role },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      res.status(201).json({ member: { id: member.id, userId: member.userId, role: member.role, user: member.user } });
    } catch (e) {
      if (e.code === "P2002") return res.status(409).json({ error: "User is already a member" });
      throw e;
    }
  }
);

router.patch(
  "/:projectId/members/:userId",
  param("projectId").isString(),
  param("userId").isString(),
  body("role").isIn(["ADMIN", "MEMBER"]),
  validate,
  requireProjectMember,
  requireAdmin,
  async (req, res) => {
    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.projectId, userId: req.params.userId } },
    });
    if (!target) return res.status(404).json({ error: "Member not found" });

    if (target.role === "ADMIN" && req.body.role === "MEMBER") {
      const adminCount = await prisma.projectMember.count({ where: { projectId: req.params.projectId, role: "ADMIN" } });
      if (adminCount <= 1) return res.status(400).json({ error: "Project must keep at least one admin" });
    }

    const updated = await prisma.projectMember.update({
      where: { id: target.id },
      data: { role: req.body.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.json({ member: { id: updated.id, userId: updated.userId, role: updated.role, user: updated.user } });
  }
);

router.delete(
  "/:projectId/members/:userId",
  param("projectId").isString(),
  param("userId").isString(),
  validate,
  requireProjectMember,
  requireAdmin,
  async (req, res) => {
    if (req.params.userId === req.userId) {
      return res.status(400).json({ error: "Cannot remove yourself here" });
    }

    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.projectId, userId: req.params.userId } },
    });
    if (!target) return res.status(404).json({ error: "Member not found" });

    if (target.role === "ADMIN") {
      const adminCount = await prisma.projectMember.count({ where: { projectId: req.params.projectId, role: "ADMIN" } });
      if (adminCount <= 1) return res.status(400).json({ error: "Cannot remove the only admin" });
    }

    await prisma.projectMember.delete({ where: { id: target.id } });
    res.status(204).send();
  }
);

export default router;
