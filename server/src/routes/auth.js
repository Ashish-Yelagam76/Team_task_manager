import { Router } from "express";
import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { signToken, requireAuth, loadUser } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post(
  "/register",
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("Password min 8 characters"),
  body("name").trim().isLength({ min: 1, max: 120 }),
  validate,
  async (req, res) => {
    const { email, password, name } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    const token = signToken(user.id);
    res.status(201).json({ user, token });
  }
);

router.post(
  "/login",
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  validate,
  async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signToken(user.id);
    res.json({ user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }, token });
  }
);

router.get("/me", requireAuth, loadUser, (req, res) => {
  res.json({ user: req.user });
});

export default router;
