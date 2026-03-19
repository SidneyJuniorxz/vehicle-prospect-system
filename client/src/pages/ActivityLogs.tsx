import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ActivityLogs() {
    const { data: logs, isLoading, error } = trpc.system.getLogs.useQuery({ limit: 100 });

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Logs de Atividade</h1>
                    <p className="text-muted-foreground mt-2">
                        Acompanhe o histórico de ações no sistema.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Histórico Recente</CardTitle>
                        <CardDescription>Mostrando os últimos registros de atividade do sistema</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error ? (
                            <div className="text-red-500">Erro ao carregar logs: {error.message}</div>
                        ) : !logs || logs.length === 0 ? (
                            <div className="text-gray-500 text-center py-8">Nenhum log encontrado.</div>
                        ) : (
                            <div className="rounded-md border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Data/Hora</th>
                                            <th className="px-4 py-3 font-medium">Usuário ID</th>
                                            <th className="px-4 py-3 font-medium">Ação</th>
                                            <th className="px-4 py-3 font-medium">Entidade</th>
                                            <th className="px-4 py-3 font-medium">Pormenores</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {logs.map((log: any) => (
                                            <tr key={log.id} className="hover:bg-muted/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                                </td>
                                                <td className="px-4 py-3">{log.userId || "Sistema"}</td>
                                                <td className="px-4 py-3 font-medium">{log.action}</td>
                                                <td className="px-4 py-3 capitalize">{log.entityType || "-"}</td>
                                                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}>
                                                    {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : log.details) : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
