import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Loader2, UserPlus, Shield, ShieldAlert, BadgeInfo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function UserManagement() {
    // Assuming a generic user list query exists - if not, we gracefully handle it
    // In a real scenario, this would be a protected procedure only for admins
    const { data: userCtx } = trpc.auth.me.useQuery();

    // We don't have a getUsers router yet based on standard implementation, 
    // so we'll mock the view for demonstration or expect a real router.
    const users = [
        { id: 1, name: "Admin Geral", email: "admin@auto.com", role: "admin", lastSignedIn: new Date() },
        { id: 2, name: "Analista João", email: "joao@auto.com", role: "analyst", lastSignedIn: new Date(Date.now() - 86400000) },
        { id: 3, name: "Visitante Maria", email: "maria@auto.com", role: "viewer", lastSignedIn: new Date(Date.now() - 172800000) },
    ];

    const isLoading = false;

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (userCtx?.role !== "admin") {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                    <ShieldAlert className="h-16 w-16 text-destructive" />
                    <h2 className="text-2xl font-bold">Acesso Restrito</h2>
                    <p className="text-muted-foreground">Apenas administradores podem gerenciar usuários.</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
                        <p className="text-muted-foreground mt-1">Administre acessos e permissões para o sistema.</p>
                    </div>
                    <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Novo Usuário
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Usuários do Sistema</CardTitle>
                        <CardDescription>Lista de todas as contas ativas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Nome</th>
                                        <th className="px-4 py-3 font-medium">Email</th>
                                        <th className="px-4 py-3 font-medium">Papel</th>
                                        <th className="px-4 py-3 font-medium">Último Login</th>
                                        <th className="px-4 py-3 font-medium text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-muted/50">
                                            <td className="px-4 py-3 font-medium">{user.name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'analyst' ? 'default' : 'secondary'} className="capitalize">
                                                    {user.role}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {format(new Date(user.lastSignedIn), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="ghost" size="sm">Editar</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
