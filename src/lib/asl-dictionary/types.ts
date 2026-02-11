export interface ASLSign {
  id: string;
  name: string;
  description: string;
  category: ASLCategory;
  videoUrl?: string;
}

export type ASLCategory =
  | "Basic Needs"
  | "Food & Drink"
  | "Family"
  | "Animals"
  | "Feelings"
  | "Actions"
  | "Manners"
  | "Colors"
  | "Numbers"
  | "Time"
  | "Nature"
  | "Toys & Play"
  | "Body Parts"
  | "Clothing"
  | "Places"
  | "Questions";
