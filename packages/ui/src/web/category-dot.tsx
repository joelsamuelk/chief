import { categoryColorMap, type Category } from "@chief/theme";

export function CategoryDot({ category }: { category: Category }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColorMap[category] }} />;
}
