import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Trash2, ArrowDownAZ, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlayerShort } from "@/types";

interface Props {
  players: PlayerShort[];
  onReorder: (players: PlayerShort[]) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onSortAZ: () => void;
  onReverse: () => void;
}

function SortablePlayerRow({
  player,
  index,
  onRemove,
}: {
  player: PlayerShort;
  index: number;
  onRemove: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors ${
        isDragging ? "bg-primary/10 shadow-lg glow-primary" : "bg-secondary/40 hover:bg-secondary/70"
      }`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="w-8 font-mono font-semibold">{index + 1}</span>
      <span className="flex-1 truncate">{player.name}</span>

      {player.rankingPoints !== undefined && (
        <span className="font-mono">{player.rankingPoints}</span>
      )}

      <button onClick={() => onRemove(player.id)} className="transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function SelectedPlayersList({
  players,
  onReorder,
  onRemove,
  onClear,
  onSortAZ,
  onReverse,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = players.findIndex((p) => p.id === active.id);
      const newIndex = players.findIndex((p) => p.id === over.id);
      onReorder(arrayMove(players, oldIndex, newIndex));
    }
  };

  if (players.length === 0) {
    return (
      <div className="py-8">
        <p>No players selected yet.</p>
        <p className="mt-1">Search and click to add players.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Ordered List</h3>

        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onSortAZ} className="h-8 gap-1">
            <ArrowDownAZ className="w-3.5 h-3.5" /> A–Z
          </Button>
          <Button variant="ghost" size="sm" onClick={onReverse} className="h-8 gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Reverse
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={players.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {players.map((player, index) => (
              <SortablePlayerRow key={player.id} player={player} index={index} onRemove={onRemove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
