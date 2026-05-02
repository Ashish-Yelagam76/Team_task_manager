import { prisma } from "../lib/prisma.js";

export async function requireProjectMember(req, res, next) {
  const projectId = req.params.projectId;
  if (!projectId) return res.status(400).json({ error: "projectId required" });

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.userId } },
    include: { project: true },
  });

  if (!member) return res.status(403).json({ error: "Not a member of this project" });

  req.project = member.project;
  req.membership = { role: member.role, memberId: member.id };
  next();
}

export function requireAdmin(req, res, next) {
  if (req.membership?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin role required" });
  }
  next();
}
