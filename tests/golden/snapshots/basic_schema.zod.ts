// =========================================================
//  Golden Snapshot for ZodEmitter
//  File: basic_schema.zod.ts
//  Description:
//    - This is the expected output generated from basic_schema.json IR
//    - runner.js will compare the real output with this snapshot.
// =========================================================

import { z } from "zod";

// =============== User Schema ===============
export const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  posts: z.array(z.lazy(() => PostSchema)).nullable(),
});
export type User = z.infer<typeof UserSchema>;

// =============== Post Schema ===============
export const PostSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string().nullable(),
  author: z.lazy(() => UserSchema),
});
export type Post = z.infer<typeof PostSchema>;
