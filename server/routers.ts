import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
// import { protectedProcedure } from "./_core/trpc"; // Uncomment for auth-protected routes
// import { z } from "zod"; // Uncomment for input validation
// import { db } from "./db"; // Uncomment for database access
// import { eq } from "drizzle-orm"; // Uncomment for query helpers
// import * as schema from "../drizzle/schema"; // Uncomment for schema types

export const appRouter = router({
  system: systemRouter,

  // ==========================================================================
  // ADD YOUR API ROUTES BELOW
  // ==========================================================================

  // Example: Full CRUD router for a "todos" table
  // Uncomment and modify for your use case:
  //
  // todos: router({
  //   // List all todos (public)
  //   list: publicProcedure.query(async () => {
  //     if (!db) return [];
  //     return db.select().from(schema.todos).orderBy(schema.todos.createdAt);
  //   }),
  //
  //   // Get single todo by ID
  //   get: publicProcedure
  //     .input(z.object({ id: z.number() }))
  //     .query(async ({ input }) => {
  //       if (!db) return null;
  //       const [todo] = await db.select().from(schema.todos).where(eq(schema.todos.id, input.id));
  //       return todo ?? null;
  //     }),
  //
  //   // Create a new todo
  //   create: publicProcedure
  //     .input(z.object({ title: z.string().min(1), completed: z.boolean().optional() }))
  //     .mutation(async ({ input }) => {
  //       if (!db) throw new Error("Database not available");
  //       const [todo] = await db.insert(schema.todos).values(input).returning();
  //       return todo;
  //     }),
  //
  //   // Update a todo
  //   update: publicProcedure
  //     .input(z.object({ id: z.number(), title: z.string().optional(), completed: z.boolean().optional() }))
  //     .mutation(async ({ input }) => {
  //       if (!db) throw new Error("Database not available");
  //       const { id, ...data } = input;
  //       const [todo] = await db.update(schema.todos).set(data).where(eq(schema.todos.id, id)).returning();
  //       return todo;
  //     }),
  //
  //   // Delete a todo
  //   delete: publicProcedure
  //     .input(z.object({ id: z.number() }))
  //     .mutation(async ({ input }) => {
  //       if (!db) throw new Error("Database not available");
  //       await db.delete(schema.todos).where(eq(schema.todos.id, input.id));
  //       return { success: true };
  //     }),
  // }),

  // Example: Protected route (requires login)
  // Uncomment protectedProcedure import above first
  //
  // user: router({
  //   me: protectedProcedure.query(({ ctx }) => ctx.user),
  //   profile: protectedProcedure.query(async ({ ctx }) => {
  //     if (!db) return null;
  //     const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, ctx.user.id));
  //     return profile ?? null;
  //   }),
  // }),
});

export type AppRouter = typeof appRouter;
