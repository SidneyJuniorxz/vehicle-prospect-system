import { useRoute } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, ExternalLink, Calendar, MapPin, Gauge, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function LeadDetail() {
    const [, params] = useRoute("/leads/:id");
    const id = params?.id ? parseInt(params.id) : undefined;

    const { data: lead, isLoading, error } = trpc.leads.getById.useQuery(id!, {
        enabled: !!id,
    });

    const { data: templates } = trpc.whatsapp.getTemplates.useQuery(undefined, {
        staleTime: 1000 * 60 * 5, // 5 mins
    });

    const generateWhatsAppLink = (contactInfo: string, title?: string, price?: string | number | null, city?: string, mileage?: number | null, year?: number | null, status?: string) => {
        let text = `Olá! O anúncio do ${title} ainda está disponível?`;

        if (templates && status) {
            const tpl = templates.find(t => t.status === status);
            if (tpl && tpl.message) {
                text = tpl.message
                    .replace(/{{veiculo}}/g, title || "veículo")
                    .replace(/{{preco}}/g, formatCurrency(price))
                    .replace(/{{ano}}/g, String(year || ""))
                    .replace(/{{km}}/g, String(mileage || ""))
                    .replace(/{{cidade}}/g, city || "");
            }
        }

        // Clean non-digits from contact info
        const cleanNumber = contactInfo.replace(/\D/g, "");
        const finalNumber = cleanNumber.length <= 11 ? `55${cleanNumber}` : cleanNumber;

        return `https://wa.me/${finalNumber}?text=${encodeURIComponent(text)}`;
        return `https://wa.me/${finalNumber}?text=${encodeURIComponent(text)}`;
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !lead) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                    <h2 className="text-2xl font-bold">Ops! Prospecção não encontrada.</h2>
                    <Button onClick={() => window.history.back()}>Voltar</Button>
                </div>
            </DashboardLayout>
        );
    }

    // We need the ad data which is not included in getById by default in the current schema implementation.
    // For the MVP, we will assume it's there or we will need to update the getById procedure to include the relationship.
    // We'll update getById router to fetch vehiclesAds in the next step.

    const formatCurrency = (value: number | string | null | undefined) => {
        if (!value) return "N/A";
        const num = typeof value === "string" ? parseFloat(value) : value;
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(num);
    };

    const ad = lead.ad; // Assumes relationship is populated

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold">Detalhes da Prospecção #{lead.id}</h1>
                    <Badge variant={lead.priority === "high" ? "destructive" : lead.priority === "medium" ? "default" : "secondary"}>
                        {lead.priority}
                    </Badge>
                    <Badge variant="outline">{lead.status}</Badge>
                    <span className="font-semibold px-2 py-1 bg-gray-100 rounded text-sm">Score: {lead.score}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-2xl">{ad?.title || "Carregando dados do veículo..."}</CardTitle>
                                        <CardDescription className="mt-2">Fonte: {ad?.source}</CardDescription>
                                    </div>
                                    {ad?.url && (
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={ad.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Ver Anúncio
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <p className="text-sm text-gray-500">Preço</p>
                                            <p className="font-semibold">{formatCurrency(ad?.price)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <p className="text-sm text-gray-500">Ano</p>
                                            <p className="font-semibold">{ad?.year || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Gauge className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <p className="text-sm text-gray-500">Quilometragem</p>
                                            <p className="font-semibold">{ad?.mileage ? `${ad.mileage} km` : "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <p className="text-sm text-gray-500">Localização</p>
                                            <p className="font-semibold">{ad?.city ? `${ad.city} - ${ad.state}` : "N/A"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg mb-2">Descrição do Anúncio</h3>
                                    <div className="bg-gray-50 p-4 rounded-md text-gray-700 whitespace-pre-wrap">
                                        {ad?.description || "Sem descrição disponível."}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Motivo do Score</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700">{lead.scoreReason || "Nenhum motivo específico registrado."}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Ações da Prospecção</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Status Atual</p>
                                    <select className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                        <option value={lead.status || ""}>{lead.status || "N/A"}</option>
                                        {/* Add options to change status later via a proper form/mutation */}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Notas</p>
                                    <textarea
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Adicione notas sobre o contato com este chumbo..."
                                        defaultValue={lead.notes || ""}
                                    />
                                </div>

                                <Button className="w-full">Salvar Alterações</Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Informações do Vendedor</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500">Nome</p>
                                    <p className="font-medium">{ad?.sellerName || "Não informado"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Tipo</p>
                                    <p className="font-medium capitalize">{ad?.sellerType || "Desconhecido"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Contato (Telefone/WhatsApp)</p>
                                    {ad?.contactInfo ? (
                                        <a href={generateWhatsAppLink(ad.contactInfo, ad.title, ad.price, ad.city || "sua cidade", ad.mileage, ad.year, lead.status || "new")} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                                            {ad.contactInfo} <ExternalLink className="h-3 w-3" />
                                        </a>
                                    ) : (
                                        <p className="font-medium italic text-gray-400">Não informado no anúncio</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Última Interação</p>
                                    <p className="font-medium">{lead.contactedAt ? format(new Date(lead.contactedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Nenhum contato registrado"}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Metadados</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Adicionado em:</span>
                                    <span>{format(new Date(lead.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                </div>
                                {ad?.adPostedAt && (
                                    <div className="flex justify-between">
                                        <span>Publicado em:</span>
                                        <span>{format(new Date(ad.adPostedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Última atualização:</span>
                                    <span>{format(new Date(lead.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
