import Image from "next/image";
import { Flag, FolderTree, Inbox, ListTree, RefreshCw, Sun } from "lucide-react";
import type { ComponentType } from "react";

type Feature = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  image: { src: string; alt: string; width: number; height: number };
};

/**
 * Los seis bloques exactos de la fase 1 (bloque 12.6, requisito de la
 * grilla de Funcionalidades): "Sincronización al instante" reemplaza a los
 * atajos de teclado, que pasaron a "Lo que viene" (fase 2).
 */
const FEATURES: Feature[] = [
  {
    title: "Bandeja de entrada",
    description: "Sacá todo de la cabeza.",
    icon: Inbox,
    image: {
      src: "/landing/inbox.webp",
      alt: "La bandeja de entrada de Trazio con tareas sin proyecto",
      width: 2880,
      height: 1800,
    },
  },
  {
    title: "Hoy",
    description: "Lo de hoy y lo atrasado, sin ruido.",
    icon: Sun,
    image: {
      src: "/landing/today-detail.webp",
      alt: "La vista Hoy con las tareas atrasadas destacadas y las de hoy debajo",
      width: 1536,
      height: 1184,
    },
  },
  {
    title: "Proyectos y secciones",
    description: "Tu estructura, no la nuestra.",
    icon: FolderTree,
    image: {
      src: "/landing/projects-sections.webp",
      alt: "El árbol de proyectos del panel lateral, con secciones dentro de un proyecto",
      width: 2880,
      height: 1222,
    },
  },
  {
    title: "Prioridades y fechas",
    description: "Lo importante primero.",
    icon: Flag,
    image: {
      src: "/landing/priorities-dates.webp",
      alt: "Tareas con su prioridad y su fecha bien visibles",
      width: 960,
      height: 64,
    },
  },
  {
    title: "Subtareas",
    description: "Dividí lo grande.",
    icon: ListTree,
    image: {
      src: "/landing/subtasks.webp",
      alt: "Una tarea con subtareas anidadas en varios niveles",
      width: 1536,
      height: 448,
    },
  },
  {
    title: "Sincronización al instante",
    description: "Abrís en la compu y en el teléfono, siempre igual.",
    icon: RefreshCw,
    image: {
      src: "/landing/sync.webp",
      alt: "La misma tarea recién completada, sincronizada al instante entre la computadora y el teléfono",
      width: 3484,
      height: 458,
    },
  },
];

export function FeaturesSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="funcionalidades-heading">
      <h2 id="funcionalidades-heading" className="text-center text-2xl font-semibold text-foreground">
        Todo lo que necesitás para organizar tu día
      </h2>
      <div className="mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="overflow-hidden rounded-xl border border-border bg-surface">
            <Image
              src={feature.image.src}
              alt={feature.image.alt}
              width={feature.image.width}
              height={feature.image.height}
              loading="lazy"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-auto w-full border-b border-border"
            />
            <div className="space-y-1 p-4">
              <div className="flex items-center gap-2">
                <feature.icon className="size-4 text-primary" aria-hidden />
                <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
              </div>
              <p className="text-sm text-text-secondary">{feature.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
