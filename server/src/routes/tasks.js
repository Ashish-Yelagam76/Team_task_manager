import { Router } from "express";
import { body, param } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { requireAuth, loadUser } from "../middleware/auth.js";
import { requireProjectMember } from "../middleware/projectAccess.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth, loadUser);

function canEditTask(membership, task, userId) {
  if (membership.role === "ADMIN") return true;
  return task.createdById === userId || task.assigneeId === userId;
}

router.get("/:projectId/tasks", param("projectId").isString(), validate, requireProjectMember, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.params.projectId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  res.json({ tasks });
});

router.post(
  "/:projectId/tasks",
  param("projectId").isString(),
  body("title").trim().isLength({ min: 1, max: 300 }),
  body("description").optional().trim().isLength({ max: 5000 }),
  body("status").optional().isIn(["TODO", "IN_PROGRESS", "DONE"]),
  body("assigneeId").optional().isString(),
  body("dueDate").optional().custom((v) => v == null || v === "" || !Number.isNaN(Date.parse(v))),
  validate,
  requireProjectMember,
  async (req, res) => {
    if (req.body.assigneeId) {
      const m = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: req.params.projectId, userId: req.body.assigneeId } },
      });
      if (!m) return res.status(400).json({ error: "Assignee must be a project member" });
    }

    if (req.membership.role === "MEMBER" && req.body.assigneeId && req.body.assigneeId !== req.userId) {
      return res.status(403).json({ error: "Members can only assign tasks to themselves" });
    }

    const task = await prisma.task.create({
      data: {
        projectId: req.params.projectId,
        title: req.body.title,
        description: req.body.description || null,
        status: req.body.status || "TODO",
        assigneeId: req.body.assigneeId || null,
        createdById: req.userId,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    res.status(201).json({ task });
  }
);

router.patch(
  "/:projectId/tasks/:taskId",
  param("projectId").isString(),
  param("taskId").isString(),
  body("title").optional().trim().isLength({ min: 1, max: 300 }),
  body("description").optional().trim().isLength({ max: 5000 }),
  body("status").optional().isIn(["TODO", "IN_PROGRESS", "DONE"]),
  body("assigneeId").optional({ nullable: true }).isString(),
  body("dueDate").optional({ nullable: true }).custom((v) => v == null || v === "" || !Number.isNaN(Date.parse(v))),
  validate,
  requireProjectMember,
  async (req, res) => {
    const task = await prisma.task.findFirst({
      where: { id: req.params.taskId, projectId: req.params.projectId },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (!canEditTask(req.membership, task, req.userId)) {
      return res.status(403).json({ error: "You cannot edit this task" });
    }

    if (req.body.assigneeId !== undefined && req.body.assigneeId !== null) {
      const m = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: req.params.projectId, userId: req.body.assigneeId } },
      });
      if (!m) return res.status(400).json({ error: "Assignee must be a project member" });
    }

    if (
      req.membership.role === "MEMBER" &&
      req.body.assigneeId !== undefined &&
      req.body.assigneeId !== null &&
      req.body.assigneeId !== req.userId
    ) {
      return res.status(403).json({ error: "Members can only assign to themselves" });
    }

    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.assigneeId !== undefined) data.assigneeId = req.body.assigneeId;
    if (req.body.dueDate !== undefined) data.dueDate = req.body.dueDate === null ? null : new Date(req.body.dueDate);

    const updated = await prisma.task.update({
      where: { id: task.id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ task: updated });
  }
);

router.delete(
  "/:projectId/tasks/:taskId",
  param("projectId").isString(),
  param("taskId").isString(),
  validate,
  requireProjectMember,
  async (req, res) => {
    const task = await prisma.task.findFirst({
      where: { id: req.params.taskId, projectId: req.params.projectId },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const isAdmin = req.membership.role === "ADMIN";
    const owns = task.createdById === req.userId || task.assigneeId === req.userId;
    if (!isAdmin && !owns) {
      return res.status(403).json({ error: "Only admin or task creator/assignee can delete" });
    }

    await prisma.task.delete({ where: { id: task.id } });
    res.status(204).send();
  }
);

export default router;
