import type { Id } from "../../../convex/_generated/dataModel";

export type ChildSummary = {
  _id: Id<"children">;
  name: string;
  signCount: number;
  role: "owner" | "shared";
};
