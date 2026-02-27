import { categoryColorMap, type Category } from "@chief/theme";
import { View } from "react-native";

export function CategoryDot({ category }: { category: Category }) {
  return <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColorMap[category] }} />;
}
