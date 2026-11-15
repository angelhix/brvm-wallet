import { Link } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "./page-header";
import { Button } from "@/components/ui/button";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-start gap-4 rounded-2xl border bg-card p-8 shadow-card">
        <Hammer className="h-6 w-6 text-primary" />
        <p className="max-w-lg text-muted-foreground">Cet écran est en cours de construction. Il arrive très vite.</p>
        <Button asChild variant="outline"><Link to="/dashboard">Retour à la vue d'ensemble</Link></Button>
      </div>
    </>
  );
}
