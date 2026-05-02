import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, loadUser } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, loadUser);

router.get("/summary", async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.userId },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    return res.json({
      totals: { tasks: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 },
      byProject: [],
      myTasks: [],
    });
  }

  const [totals, byProject, myTasks] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["projectId", "status"],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        OR: [{ assigneeId: req.userId }, { createdById: req.userId }],
        status: { not: "DONE" },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
  ]);

  const statusMap = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const row of totals) statusMap[row.status] = row._count._all;
  const taskTotal = Object.values(statusMap).reduce((a, b) => a + b, 0);

  const overdue = await prisma.task.count({
    where: {
      projectId: { in: projectIds },
      status: { not: "DONE" },
      dueDate: { lt: startOfToday },
    },
  });

  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true },
  });
  const nameById = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const projAgg = {};
  for (const row of byProject) {
    if (!projAgg[row.projectId]) {
      projAgg[row.projectId] = { projectId: row.projectId, name: nameById[row.projectId], todo: 0, inProgress: 0, done: 0 };
    }
    if (row.status === "TODO") projAgg[row.projectId].todo = row._count._all;
    if (row.status === "IN_PROGRESS") projAgg[row.projectId].inProgress = row._count._all;
    if (row.status === "DONE") projAgg[row.projectId].done = row._count._all;
  }

  res.json({
    totals: {
      tasks: taskTotal,
      todo: statusMap.TODO,
      inProgress: statusMap.IN_PROGRESS,
      done: statusMap.DONE,
      overdue,
    },
    byProject: Object.values(projAgg),
    myTasks: myTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      project: t.project,
      assignee: t.assignee,
    })),
  });
});

export default router;
