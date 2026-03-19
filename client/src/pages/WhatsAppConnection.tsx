import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { QrCode, Wifi, WifiOff, RefreshCw, LogOut, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "../components/DashboardLayout";

export default function WhatsAppConnection() {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const statusQuery = trpc.whatsapp.getConnectionStatus.useQuery(undefined, {
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data?.status === "connecting" || data?.status === "qr_ready") return 3000;
            return 10000;
        }
    });

    const initMutation = trpc.whatsapp.initialize.useMutation({
        onSuccess: () => {
            toast.info("Iniciando conexão com WhatsApp...");
            statusQuery.refetch();
        },
        onError: (e) => {
            toast.error(`Falha ao iniciar: ${e.message}`);
        }
    });

    const logoutMutation = trpc.whatsapp.logout.useMutation({
        onSuccess: () => {
            toast.success("Desconectado com sucesso!");
            statusQuery.refetch();
        },
        onError: (e) => {
            toast.error(`Erro ao desconectar: ${e.message}`);
        }
    });

    const handleConnect = () => {
        initMutation.mutate();
    };

    const handleDisconnect = () => {
        if (confirm("Tem certeza que deseja desconectar o WhatsApp?")) {
            logoutMutation.mutate();
        }
    };

    const getStatusDisplay = () => {
        const status = statusQuery.data?.status || "disconnected";
        switch (status) {
            case "ready":
                return {
                    label: "Conectado",
                    color: "bg-green-100 text-green-800 border-green-200",
                    icon: <Wifi className="w-5 h-5 text-green-600" />,
                    description: "O sistema está pronto para enviar e receber mensagens automaticamente."
                };
            case "qr_ready":
                return {
                    label: "Aguardando Leitura",
                    color: "bg-blue-100 text-blue-800 border-blue-200",
                    icon: <QrCode className="w-5 h-5 text-blue-600" />,
                    description: "Escaneie o QR Code abaixo com seu WhatsApp (Aparelhos Conectados)."
                };
            case "connecting":
                return {
                    label: "Conectando...",
                    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
                    icon: <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />,
                    description: "Iniciando o serviço do WhatsApp. Por favor, aguarde."
                };
            case "failed":
                return {
                    label: "Falha na Conexão",
                    color: "bg-red-100 text-red-800 border-red-200",
                    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
                    description: `Erro: ${statusQuery.data?.lastError || "Erro desconhecido"}`
                };
            default:
                return {
                    label: "Desconectado",
                    color: "bg-gray-100 text-gray-800 border-gray-200",
                    icon: <WifiOff className="w-5 h-5 text-gray-600" />,
                    description: "O robô de WhatsApp não está ativo no momento."
                };
        }
    };

    const display = getStatusDisplay();

    return (
        <DashboardLayout>
            <div className="container mx-auto py-8 max-w-4xl space-y-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-heading bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
                        Conexão WhatsApp
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Gerencie a conexão do robô para automação de mensagens e captura de respostas.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Status do Robô</CardTitle>
                                    <CardDescription>Estado atual da integração</CardDescription>
                                </div>
                                <Badge className={`${display.color} px-3 py-1 text-xs font-bold uppercase`}>
                                    {display.label}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-accent/30 rounded-lg border">
                                {display.icon}
                                <p className="text-sm font-medium">{display.description}</p>
                            </div>

                            {statusQuery.data?.status === "qr_ready" && statusQuery.data.qrCode && (
                                <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border-2 border-dashed border-primary/20">
                                    <img
                                        src={statusQuery.data.qrCode}
                                        alt="WhatsApp QR Code"
                                        className="w-64 h-64 shadow-xl rounded-lg mb-4"
                                    />
                                    <p className="text-sm text-center text-muted-foreground max-w-xs">
                                        Abra o WhatsApp no seu celular, vá em <strong>Aparelhos Conectados</strong> e aponte a câmera para esta tela.
                                    </p>
                                </div>
                            )}

                            {statusQuery.data?.status === "ready" && (
                                <div className="flex flex-col items-center justify-center p-12 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-900/30">
                                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                                    <h3 className="text-xl font-bold text-green-800 dark:text-green-300">WhatsApp Conectado!</h3>
                                    <p className="text-sm text-green-600 dark:text-green-400 text-center mt-2">
                                        O bot está monitorando as mensagens e enviando automações ativas.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="bg-accent/10 border-t px-6 py-4 flex justify-between">
                            <div className="text-xs text-muted-foreground">
                                {statusQuery.data?.status === "ready" ? "Dica: Mantenha o celular com internet." : "Dica: O QR Code expira em alguns minutos."}
                            </div>
                            <div className="flex gap-3">
                                {statusQuery.data?.status === "disconnected" || statusQuery.data?.status === "failed" ? (
                                    <Button onClick={handleConnect} disabled={initMutation.isPending}>
                                        <Wifi className="w-4 h-4 mr-2" />
                                        Ligar Robô
                                    </Button>
                                ) : (
                                    <Button variant="destructive" onClick={handleDisconnect} disabled={logoutMutation.isPending}>
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Desconectar
                                    </Button>
                                )}
                            </div>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Configurações Rápidas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase text-muted-foreground">Automação de Envio</p>
                                <div className="flex items-center justify-between p-3 bg-accent/20 rounded-md border text-sm">
                                    <span>Envio para Leads "Alta"</span>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ativado</Badge>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase text-muted-foreground">Respostas Automáticas</p>
                                <div className="flex items-center justify-between p-3 bg-accent/20 rounded-md border text-sm">
                                    <span>Troca de Status Transac.</span>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ativado</Badge>
                                </div>
                            </div>

                            <div className="pt-4 border-t mt-4">
                                <p className="text-[10px] leading-relaxed text-muted-foreground italic">
                                    Nota: O envio automático ocorre apenas quando você inicia uma nova busca no Dashboard com a opção "Envio Automático" selecionada.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
