import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validate } from "../middleware/validate";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { recomputeAndPersistHolding } from "../services/holdingService";

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

const decimalString = z
  .union([z.number(), z.string()])
  .transform((v) => String(v))
  .refine((v) => /^\d+(\.\d+)?$/.test(v), "Must be a positive number")
  .refine((v) => Number(v) > 0, "Must be greater than 0");

const feeString = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? "0" : String(v)))
  .refine((v) => /^\d+(\.\d+)?$/.test(v), "Fee must be a non-negative number");

const createSchema = z.object({
  symbol: z.string().min(1).max(12).transform((s) => s.toUpperCase().trim()),
  type: z.enum(["BUY", "SELL"]),
  quantity: decimalString,
  price: decimalString,
  fee: feeString,
  note: z.string().max(500).optional(),
  executedAt: z.coerce.date(),
});

// All fields optional for partial update.
const updateSchema = createSchema.partial();

// GET /api/transactions
transactionsRouter.get("/", async (req: AuthedRequest, res: Response) => {
  const txs = await prisma.transaction.findMany({
    where: { userId: req.userId },
    orderBy: { executedAt: "desc" },
  });
  res.json({ transactions: txs.map(serializeTx) });
});

// POST /api/transactions
transactionsRouter.post("/", validate(createSchema), async (req: AuthedRequest, res: Response) => {
  const data = (req as any).valid as z.infer<typeof createSchema>;
  const userId = req.userId!;

  const tx = await prisma.transaction.create({
    data: {
      userId,
      symbol: data.symbol,
      type: data.type,
      quantity: data.quantity,
      price: data.price,
      fee: data.fee,
      note: data.note,
      executedAt: data.executedAt,
    },
  });

  // Recompute will throw on oversell; roll back the insert if so.
  try {
    await recomputeAndPersistHolding(userId, data.symbol);
  } catch (err) {
    await prisma.transaction.delete({ where: { id: tx.id } });
    throw err;
  }

  res.status(201).json({ transaction: serializeTx(tx) });
});

// PUT /api/transactions/:id
transactionsRouter.put(
  "/:id",
  validate(updateSchema),
  async (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    const data = (req as any).valid as z.infer<typeof updateSchema>;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Transaction not found" });

    const oldSnapshot = { ...existing };
    const newSymbol = data.symbol ?? existing.symbol;

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        symbol: data.symbol,
        type: data.type,
        quantity: data.quantity,
        price: data.price,
        fee: data.fee,
        note: data.note,
        executedAt: data.executedAt,
      },
    });

    try {
      // Recompute both old and new symbol if symbol changed.
      await recomputeAndPersistHolding(userId, newSymbol);
      if (newSymbol !== oldSnapshot.symbol) {
        await recomputeAndPersistHolding(userId, oldSnapshot.symbol);
      }
    } catch (err) {
      // Roll back to the previous values and recompute again.
      await prisma.transaction.update({
        where: { id },
        data: {
          symbol: oldSnapshot.symbol,
          type: oldSnapshot.type,
          quantity: oldSnapshot.quantity,
          price: oldSnapshot.price,
          fee: oldSnapshot.fee,
          note: oldSnapshot.note,
          executedAt: oldSnapshot.executedAt,
        },
      });
      await recomputeAndPersistHolding(userId, oldSnapshot.symbol);
      if (newSymbol !== oldSnapshot.symbol) {
        await recomputeAndPersistHolding(userId, newSymbol);
      }
      throw err;
    }

    res.json({ transaction: serializeTx(updated) });
  }
);

// DELETE /api/transactions/:id
transactionsRouter.delete("/:id", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: "Transaction not found" });

  await prisma.transaction.delete({ where: { id } });
  await recomputeAndPersistHolding(userId, existing.symbol);

  res.json({ ok: true });
});

function serializeTx(t: {
  id: string;
  symbol: string;
  type: string;
  quantity: { toString(): string };
  price: { toString(): string };
  fee: { toString(): string };
  note: string | null;
  executedAt: Date;
  createdAt: Date;
}) {
  return {
    id: t.id,
    symbol: t.symbol,
    type: t.type,
    quantity: t.quantity.toString(),
    price: t.price.toString(),
    fee: t.fee.toString(),
    note: t.note,
    executedAt: t.executedAt,
    createdAt: t.createdAt,
  };
}
