import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, Download, Play, Settings, XCircle, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [priority, setPriority] = useState<"high" | "medium" | "low" | undefined>();
  const [status, setStatus] = useState<string>();
  const [isCollecting, setIsCollecting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Search Parameters State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchParams, setSearchParams] = useState({
    state: "SP",
    city: "",
    brand: "",
    model: "",
    color: "",
    minPrice: "",
    maxPrice: "100000",
    minYear: "",
    maxYear: "",
    minMileage: "",
    maxMileage: "",
    includeImages: false,
    visibleBrowser: false,
    deepScrape: false,
    useLLM: false,
    autoSend: false,
  });

  const [filterBrand, setFilterBrand] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  const leadsQuery = trpc.leads.list.useQuery({
    priority,
    status,
    brand: filterBrand || undefined,
    model: filterModel || undefined,
    limit: 100,
  });

  const statsQuery = trpc.leads.stats.useQuery({
    brand: filterBrand || undefined,
    model: filterModel || undefined,
  });

  const filterOptionsQuery = trpc.leads.getFilterOptions.useQuery();

  const jobStatusQuery = trpc.collection.getJobStatus.useQuery(activeJobId!, {
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return (data?.status === "completed" || data?.status === "failed") ? false : 2000;
    },
  });

  // Handle job completion
  if (activeJobId && jobStatusQuery.data?.status === "completed") {
    toast.success("Busca finalizada com sucesso!");
    setActiveJobId(null);
    leadsQuery.refetch();
    statsQuery.refetch();
  }
  if (activeJobId && jobStatusQuery.data?.status === "failed") {
    toast.error(`A busca falhou: ${jobStatusQuery.data.error}`);
    setActiveJobId(null);
  }

  const exportMutation = trpc.export.exportLeads.useMutation({
    onSuccess: (result) => {
      let blob;
      if (result.format === 'csv' || result.format === 'json') {
        blob = new Blob([result.data as string], { type: 'text/plain' });
      } else {
        const byteCharacters = atob(result.data as string);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'application/octet-stream' });
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Exportação concluída com sucesso!');
      setIsExporting(false);
    },
    onError: (error) => {
      toast.error(`Erro ao exportar: ${error.message}`);
      setIsExporting(false);
    }
  });

  const collectMutation = trpc.collection.collect.useMutation({
    onSuccess: (result) => {
      setActiveJobId(result.jobId);
      toast.info("Busca iniciada em segundo plano.");
      setSearchOpen(false);
      setIsCollecting(false);
    },
    onError: (error) => {
      toast.error(`Erro na coleta: ${error.message}`);
      setIsCollecting(false);
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    await exportMutation.mutateAsync({
      format: 'excel',
      filters: {
        priority,
        status,
        brand: filterBrand || undefined,
        model: filterModel || undefined
      }
    });
  };

  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      // Clean up empty strings before sending to backend
      const cleanParams: Record<string, any> = {};
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== "") cleanParams[key] = value;
      });

      await collectMutation.mutateAsync({
        searchParams: cleanParams,
        useLLM: searchParams.useLLM,
        autoSend: searchParams.autoSend,
      });
    } catch (error) {
      console.error("Coleta failed via mutateAsync", error);
    }
  };

  const handleParamChange = (field: string, value: string | boolean) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "reviewed":
        return "bg-purple-100 text-purple-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Painel de Prospecções</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/scoring")}>
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>

            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button disabled={isCollecting}>
                  {isCollecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Buscando Oportunidades...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Nova Busca de Anúncios
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Parâmetros de Busca</DialogTitle>
                  <DialogDescription>
                    Defina os filtros detalhados para os robôs procurarem novos veículos.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estado (UF)</label>
                      <Input placeholder="SP" value={searchParams.state} onChange={(e) => handleParamChange('state', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cidade (opcional)</label>
                      <Input placeholder="São Paulo" value={searchParams.city} onChange={(e) => handleParamChange('city', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Marca</label>
                      <Input placeholder="Honda, Fiat..." value={searchParams.brand} onChange={(e) => handleParamChange('brand', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Modelo</label>
                      <Input placeholder="Civic, Uno..." value={searchParams.model} onChange={(e) => handleParamChange('model', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preço Mínimo</label>
                      <Input type="number" placeholder="0" value={searchParams.minPrice} onChange={(e) => handleParamChange('minPrice', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preço Máximo</label>
                      <Input type="number" placeholder="100000" value={searchParams.maxPrice} onChange={(e) => handleParamChange('maxPrice', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ano Mínimo</label>
                      <Input type="number" placeholder="2015" value={searchParams.minYear} onChange={(e) => handleParamChange('minYear', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ano Máximo</label>
                      <Input type="number" placeholder="2024" value={searchParams.maxYear} onChange={(e) => handleParamChange('maxYear', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">KM Mínima</label>
                      <Input type="number" placeholder="0" value={searchParams.minMileage} onChange={(e) => handleParamChange('minMileage', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">KM Máxima</label>
                      <Input type="number" placeholder="80000" value={searchParams.maxMileage} onChange={(e) => handleParamChange('maxMileage', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-start">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cor (opcional)</label>
                      <Input placeholder="Preto, Prata..." value={searchParams.color} onChange={(e) => handleParamChange('color', e.target.value)} />
                    </div>
                    <div className="flex flex-col space-y-4 pt-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include-images"
                          checked={searchParams.includeImages}
                          onCheckedChange={(checked) => handleParamChange('includeImages', checked)}
                        />
                        <label htmlFor="include-images" className="text-sm font-medium cursor-pointer">
                          Obter Fotos dos Anúncios
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="visible-browser"
                          checked={searchParams.visibleBrowser}
                          onCheckedChange={(checked) => handleParamChange('visibleBrowser', checked)}
                        />
                        <label htmlFor="visible-browser" className="text-sm font-medium cursor-pointer text-blue-600">
                          Ver Robô Trabalhando (Abre o Chrome real)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="deep-scrape"
                          checked={searchParams.deepScrape}
                          onCheckedChange={(checked) => handleParamChange('deepScrape', checked)}
                        />
                        <label htmlFor="deep-scrape" className="text-sm font-medium cursor-pointer text-orange-600" title="Entrar em cada anúncio para extrair telefone/WhatsApp. Muito mais lento!">
                          Coleta Profunda de Contatos
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="use-llm"
                          checked={searchParams.useLLM}
                          onCheckedChange={(checked) => handleParamChange('useLLM', checked)}
                        />
                        <label htmlFor="use-llm" className="text-sm font-medium cursor-pointer text-purple-600" title="Usa IA Gemini para limpar dados e identificar marcas/modelos corretamente.">
                          Usar IA para Limpeza de Dados (Gemini)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="auto-send"
                          checked={searchParams.autoSend}
                          onCheckedChange={(checked) => handleParamChange('autoSend', checked)}
                        />
                        <label htmlFor="auto-send" className="text-sm font-medium cursor-pointer text-green-600" title="Envia automaticamente a mensagem do WhatsApp para leads de Alta Prioridade assim que forem encontrados.">
                          Envio Automático (WhatsApp)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSearchOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCollect} disabled={isCollecting}>
                    {isCollecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Iniciando Scrapers...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Iniciar Busca
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {activeJobId && jobStatusQuery.data && (
          <Alert className="border-blue-200 bg-blue-50">
            <Loader2 className="h-4 h-4 animate-spin text-blue-600" />
            <AlertTitle className="text-blue-800 flex items-center gap-2">
              Robô de Busca em Ação: {jobStatusQuery.data.name}
              <Badge variant="outline" className="ml-2 bg-blue-100 uppercase text-[10px]">
                {jobStatusQuery.data.status}
              </Badge>
            </AlertTitle>
            <AlertDescription className="text-blue-700 mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>{(jobStatusQuery.data.progress as any).currentStep || "Conectando..."}</span>
                <span>
                  {(jobStatusQuery.data.progress as any).processed} / {(jobStatusQuery.data.progress as any).total || '?'}
                </span>
              </div>
              <Progress
                value={((jobStatusQuery.data.progress as any).processed / ((jobStatusQuery.data.progress as any).total || 1)) * 100}
                className="h-2"
              />
              <p className="text-[10px] mt-1 italic">
                Você pode continuar trabalhando. A lista será atualizada automaticamente ao final.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Prospecções</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsQuery.data?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Alta Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsQuery.data?.high || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Média Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {statsQuery.data?.medium || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Novos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statsQuery.data?.new || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <Select value={priority || "all"} onValueChange={(v) => setPriority(v === "all" ? undefined : v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="reviewed">Revisado</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-[1.5]">
              <Select value={filterBrand || "all"} onValueChange={(v) => setFilterBrand(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por Marca (ex: Fiat)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Marcas</SelectItem>
                  {filterOptionsQuery.data?.brands?.map((brand) => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-[1.5]">
              <Select value={filterModel || "all"} onValueChange={(v) => setFilterModel(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por Modelo (ex: Uno)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Modelos</SelectItem>
                  {filterOptionsQuery.data?.models?.map((model) => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(filterBrand || filterModel || priority || status) && (
              <Button variant="ghost" size="sm" onClick={() => {
                setFilterBrand("");
                setFilterModel("");
                setPriority(undefined);
                setStatus(undefined);
              }}>
                <XCircle className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            )}
            <Button
              variant="outline"
              disabled={isExporting || !leadsQuery.data?.length}
              onClick={handleExport}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Painel de Prospecções</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : leadsQuery.data && leadsQuery.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Data/Hora</th>
                      <th className="text-left py-2 px-4">Veículo</th>
                      <th className="text-left py-2 px-4">Preço</th>
                      <th className="text-left py-2 px-4">Score/Prioridade</th>
                      <th className="text-left py-2 px-4">Status</th>
                      <th className="text-left py-2 px-4">Contato / Interação</th>
                      <th className="text-left py-2 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsQuery.data.map((lead: any) => (
                      <tr key={lead.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4 text-xs">
                          {new Date(lead.createdAt).toLocaleDateString()}<br />
                          <span className="text-gray-500">{new Date(lead.createdAt).toLocaleTimeString()}</span>
                        </td>
                        <td className="py-2 px-4">
                          <div className="font-medium text-sm max-w-[200px] truncate" title={lead.ad?.title}>
                            {lead.ad?.title || "Veículo não encontrado"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {lead.ad?.brand} {lead.ad?.model} • {lead.ad?.year}
                          </div>
                        </td>
                        <td className="py-2 px-4 font-semibold text-green-700">
                          {lead.ad?.price ?
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.ad.price)
                            : 'N/I'}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{lead.score}</span>
                            <Badge className={getPriorityColor(lead.priority)}>
                              {lead.priority}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">
                          <div className="text-xs">
                            {lead.ad?.contactInfo ? (
                              <a href={`https://wa.me/55${lead.ad.contactInfo}?text=Olá!`} target="_blank" rel="noreferrer" className="text-blue-600 font-medium flex items-center gap-1 hover:underline">
                                {lead.ad.contactInfo}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">Sem contato</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {lead.contactedAt ? `Interação: ${new Date(lead.contactedAt).toLocaleDateString()}` : 'Aberto'}
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/leads/${lead.id}`}>Ver Detalhes</a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhuma prospecção encontrada. Clique em "Nova Busca de Anúncios" para começar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
