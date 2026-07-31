import type { MiniMapCell } from "@/lib/habits/habit-history";
import { cn } from "@/lib/utils";

function formatCellTitle(cell: MiniMapCell): string {
  const [year, month, day] = cell.date.split("-");
  const label = `${day}/${month}/${year}`;
  if (cell.status === "before-creation") return `${label}: antes de crear el hábito`;
  return cell.status === "marked" ? `${label}: marcado` : `${label}: sin marcar`;
}

/**
 * Mini-mapa de los últimos 14 días (tarea 3.5, spec "El mini-mapa de 14
 * días es de solo lectura", decisión D-E): puramente visual, sin ningún
 * elemento interactivo — sin `<button>`, sin `onClick`, sin `tabIndex` —
 * así que no hay ninguna forma de marcar o desmarcar un día pasado desde
 * acá, ni por mouse ni por teclado. Cada celda es decorativa (`aria-hidden`)
 * y el resumen para lectores de pantalla va en un único `aria-label` del
 * contenedor, como un `role="img"`.
 *
 * El rojo de marca no se usa acá (D5): un día sin marcar es gris neutro
 * (`bg-border`), nunca rojo — no es un estado destructivo, es la ausencia
 * de una marca.
 */
export function HabitMiniMap({ cells }: { cells: MiniMapCell[] }) {
  const markedCount = cells.filter((c) => c.status === "marked").length;

  return (
    <div
      role="img"
      aria-label={`Últimos 14 días: ${markedCount} de ${cells.length} marcados`}
      className="flex items-center gap-0.5"
    >
      {cells.map((cell) => (
        <span
          key={cell.date}
          aria-hidden
          title={formatCellTitle(cell)}
          className={cn(
            "size-2.5 shrink-0 rounded-[2px] sm:size-3",
            cell.status === "marked" && "bg-primary",
            cell.status === "unmarked" && "bg-border",
            cell.status === "before-creation" && "border border-dashed border-border/50",
          )}
        />
      ))}
    </div>
  );
}
