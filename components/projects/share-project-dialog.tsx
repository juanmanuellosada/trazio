"use client";

import { Copy, Link2, Link2Off, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastSuccess } from "@/lib/toast";
import { useDeactivateProjectShareLink, useGenerateProjectShareLink, useProjectShareLink } from "@/lib/projects/share-link";

function buildShareUrl(token: string): string {
  return `${window.location.origin}/enlace/${token}`;
}

/**
 * Diálogo "Compartir" del menú de un proyecto (bloque 4, tareas 4.1/4.2):
 * generar, copiar, regenerar y desactivar el enlace de lectura. La
 * advertencia de que cualquiera con el enlace puede verlo va en
 * `DialogDescription`, siempre visible —antes y después de generar—, no
 * solo la primera vez: "que se lea, no que esté" (tarea 4.2).
 */
export function ShareProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}) {
  const { data: token, isLoading } = useProjectShareLink(projectId);
  const generate = useGenerateProjectShareLink(projectId);
  const deactivate = useDeactivateProjectShareLink(projectId);

  function handleCopy() {
    if (!token) return;
    navigator.clipboard.writeText(buildShareUrl(token)).then(() => toastSuccess("Enlace copiado."));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir “{projectName}”</DialogTitle>
          <DialogDescription>
            Quien tenga el enlace va a poder ver este proyecto sin registrarse. Nadie va a poder editarlo, comentar
            ni completar tareas.
          </DialogDescription>
        </DialogHeader>

        {!isLoading && token && (
          <div className="flex items-center gap-2">
            <Input readOnly value={buildShareUrl(token)} onFocus={(event) => event.currentTarget.select()} />
            <Button variant="outline" size="icon-sm" aria-label="Copiar enlace" onClick={handleCopy}>
              <Copy className="size-4" />
            </Button>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {token ? (
            <>
              <Button variant="destructive" onClick={() => deactivate.mutate()} disabled={deactivate.isPending}>
                <Link2Off className="size-4" />
                Desactivar
              </Button>
              <Button variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
                <RefreshCw className="size-4" />
                Regenerar
              </Button>
            </>
          ) : (
            <Button onClick={() => generate.mutate()} disabled={generate.isPending || isLoading}>
              <Link2 className="size-4" />
              Generar enlace
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
