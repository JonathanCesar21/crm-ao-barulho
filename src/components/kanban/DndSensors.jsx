import { useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
export default function DndSensors() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  return sensors;
}
