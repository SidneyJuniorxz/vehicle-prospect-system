import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ScoringConfig() {
    const { data: rules, isLoading, error } = trpc.scoring.list.useQuery();

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Regras de Scoring</h1>
                    <p className="text-muted-foreground mt-1">Configure como as prospecções são priorizadas (Alta, Média, Baixa).</p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Regra
                </Button>
            </div>

            <div className="grid gap-6">
                {error ? (
                    <div className="text-red-500">Erro: {error.message}</div>
                ) : !rules || rules.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <p>Nenhuma regra de pontuação configurada.</p>
                            <Button variant="outline" className="mt-4">Criar primeira regra</Button>
                        </CardContent>
                    </Card>
                ) : (
                    rules.map((rule: any) => (
                        <Card key={rule.id}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="space-y-1">
                                    <CardTitle>{rule.name}</CardTitle>
                                    <CardDescription>{rule.description || "Sem descrição"}</CardDescription>
                                </div>
                                <Badge variant={rule.isActive ? "default" : "secondary"}>
                                    {rule.isActive ? "Ativo" : "Inativo"}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="mt-4 bg-muted/50 p-4 rounded-md overflow-x-auto">
                                    <pre className="text-sm font-mono text-muted-foreground">
                                        {typeof rule.rules === 'string'
                                            ? JSON.stringify(JSON.parse(rule.rules), null, 2)
                                            : JSON.stringify(rule.rules, null, 2)}
                                    </pre>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button variant="outline" size="sm">Editar</Button>
                                    <Button variant="outline" size="sm" className="text-destructive">Desativar</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </DashboardLayout>
    );
}
