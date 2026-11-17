import { Segmented } from "@/components/form";
import { useSpaces } from "@/data/spaces";

type Props = {
  /** The chosen space, or "" for personal. */
  value: string;
  onChange: (spaceId: string) => void;
  /** False for someone else's shared item: it can move between spaces but can't become your personal item. */
  allowPersonal?: boolean;
};

/** "Who's it for?": just you, or one of your shared spaces. Hidden when you're in no spaces. */
export function SpacePicker({ value, onChange, allowPersonal = true }: Props) {
  const { spaces } = useSpaces();
  if (spaces.length === 0) return null;
  const options = [
    ...(allowPersonal ? [{ value: "", label: "Just me" }] : []),
    ...spaces.map((space) => ({ value: space.id, label: space.name })),
  ];
  return <Segmented label="Who's it for?" value={value} options={options} onChange={onChange} />;
}
