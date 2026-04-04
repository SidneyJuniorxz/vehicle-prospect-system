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
import { useEffect, useRef } from "react";

type SellerTypeFilter = "" | "individual" | "dealer" | "reseller" | "unknown";
type PostprocessPriority = "low" | "normal" | "high";

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
    sellerType: "",
  });

  const [filterBrand, setFilterBrand] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [filterSellerType, setFilterSellerType] = useState<SellerTypeFilter>("");
  const [autoPostprocess, setAutoPostprocess] = useState(true);
  const autoRunRef = useRef(false);
  const [postBatchSize, setPostBatchSize] = useState(2);
  const [postTimeout, setPostTimeout] = useState(90000);
  const [postPriority, setPostPriority] = useState<PostprocessPriority>("normal");
  const [lastGain, setLastGain] = useState<{ price: number; contact: number } | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [postprocessEvents, setPostprocessEvents] = useState<string[]>([]);
  const prevCompletenessRef = useRef<{ pricePct: number; contactPct: number; at: number } | null>(null);

  const leadsQuery = trpc.leads.list.useQuery({
    priority,
    status,
    brand: filterBrand || undefined,
    model: filterModel || undefined,
    sellerType: filterSellerType || undefined,
    limit: 100,
  });

  const statsQuery = trpc.leads.stats.useQuery({
    brand: filterBrand || undefined,
    model: filterModel || undefined,
  });
  const dashboardMetrics = trpc.dashboard.metrics.useQuery(undefined, { refetchInterval: 30000 });
  const runPostprocess = trpc.dashboard.runPostprocessBatch.useMutation({
    onError: (err) => toast.error(`Pós-processamento falhou: ${err.message}`),
    onSuccess: () => toast.success("Pós-processamento em lote iniciado"),
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

  useEffect(() => {
    if (postPriority === "high") {
      setPostBatchSize(4);
      setPostTimeout(120000);
    } else if (postPriority === "low") {
      setPostBatchSize(1);
      setPostTimeout(60000);
    } else {
      setPostBatchSize(2);
      setPostTimeout(90000);
    }
  }, [postPriority]);

  useEffect(() => {
    const pricePct = dashboardMetrics.data?.completeness.pricePct ?? 0;
    const contactPct = dashboardMetrics.data?.completeness.contactPct ?? 0;
    const now = Date.now();
    const prev = prevCompletenessRef.current;

    if (prev) {
      const deltaPrice = pricePct - prev.pricePct;
      const deltaContact = contactPct - prev.contactPct;
      if (deltaPrice !== 0 || deltaContact !== 0) {
        setLastGain({ price: deltaPrice, contact: deltaContact });
      }

      const prevCombined = (prev.pricePct + prev.contactPct) / 2;
      const nowCombined = (pricePct + contactPct) / 2;
      const deltaCombined = nowCombined - prevCombined;
      const elapsedMin = Math.max((now - prev.at) / 60000, 0.1);
      const ratePerMinute = deltaCombined / elapsedMin;

      if (ratePerMinute > 0 && nowCombined < 95) {
        setEtaMinutes(Math.max((95 - nowCombined) / ratePerMinute, 0));
      } else if (nowCombined >= 95) {
        setEtaMinutes(0);
      } else {
        setEtaMinutes(null);
      }
    }

    prevCompletenessRef.current = { pricePct, contactPct, at: now };
  }, [dashboardMetrics.data?.completeness.pricePct, dashboardMetrics.data?.completeness.contactPct]);

  // Auto-run postprocess until completeness >=95% if toggle is on
  useEffect(() => {
    const pricePct = dashboardMetrics.data?.completeness.pricePct ?? 0;
    const contactPct = dashboardMetrics.data?.completeness.contactPct ?? 0;
    const needsRun = autoPostprocess && (pricePct < 95 || contactPct < 95);
    if (needsRun && !runPostprocess.isPending && !autoRunRef.current) {
      const beforePrice = pricePct;
      const beforeContact = contactPct;
      const startedAt = Date.now();
      autoRunRef.current = true;
      setPostprocessEvents((prev) => [
        `[${new Date().toLocaleTimeString()}] Iniciando lote (prioridade=${postPriority}, batch=${postBatchSize})`,
        ...prev,
      ].slice(0, 6));
      runPostprocess.mutate(
        { batchSize: postBatchSize, timeoutMs: postTimeout, priority: postPriority },
        {
          onSettled: () => {
            autoRunRef.current = false;
            dashboardMetrics.refetch().then((res) => {
              const afterPrice = res.data?.completeness.pricePct ?? beforePrice;
              const afterContact = res.data?.completeness.contactPct ?? beforeContact;
              const dPrice = afterPrice - beforePrice;
              const dContact = afterContact - beforeContact;
              const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
              setPostprocessEvents((prev) => [
                `[${new Date().toLocaleTimeString()}] Lote finalizado em ${elapsedSec}s (preco ${dPrice >= 0 ? "+" : ""}${dPrice}pp, contato ${dContact >= 0 ? "+" : ""}${dContact}pp)`,
                ...prev,
              ].slice(0, 6));
            });
          },
        }
      );
    }
  }, [
    dashboardMetrics.data?.completeness,
    autoPostprocess,
    runPostprocess,
    dashboardMetrics,
    postBatchSize,
    postTimeout,
    postPriority,
  ]);

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

  const pricePct = dashboardMetrics.data?.completeness.pricePct ?? 0;
  const contactPct = dashboardMetrics.data?.completeness.contactPct ?? 0;
  const combinedPct = Math.round((pricePct + contactPct) / 2);
  const isPostprocessing = runPostprocess.isPending || autoRunRef.current;
  const etaText =
    etaMinutes === null ? "Sem previsao" : etaMinutes <= 1 ? "Menos de 1 min" : `${Math.ceil(etaMinutes)} min`;

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
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo de anunciante</label>
                      <Select value={searchParams.sellerType || "all"} onValueChange={(v) => handleParamChange('sellerType', v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="individual">Particular</SelectItem>
                          <SelectItem value="dealer">Loja/Profissional</SelectItem>
                        </SelectContent>
                      </Select>
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
              <div className="text-2xl font-bold">
                {dashboardMetrics.data?.totals.totalProspects ?? statsQuery.data?.total ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Novos 24h: {dashboardMetrics.data?.totals.new24h ?? 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Alta Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboardMetrics.data?.leads.high ?? statsQuery.data?.high ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Média Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboardMetrics.data?.leads.medium ?? statsQuery.data?.medium ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Novos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
                {dashboardMetrics.data?.totals.new24h ?? statsQuery.data?.new ?? 0}
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
            <div className="flex-1">
              <Select value={filterSellerType || "all"} onValueChange={(v) => setFilterSellerType(v === "all" ? "" : (v as SellerTypeFilter))}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de anunciante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="individual">Particular</SelectItem>
                  <SelectItem value="dealer">Loja/Profissional</SelectItem>
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
                setFilterSellerType("");
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
          <div className="flex items-center gap-2">
            <Switch id="auto-postprocess" checked={autoPostprocess} onCheckedChange={setAutoPostprocess} />
            <label htmlFor="auto-postprocess" className="text-sm">Rodar pós-processamento até 95%</label>
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completude (dados reais)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso geral para 95%</span>
                <span className="font-semibold">{combinedPct}%</span>
              </div>
              <Progress value={combinedPct} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{isPostprocessing ? "Pos-processamento em execucao" : "Aguardando proximo ciclo"}</span>
                <span>ETA 95%: {etaText}</span>
              </div>
              {lastGain && (
                <p className="text-xs text-muted-foreground">
                  Ultimo ganho: preco {lastGain.price >= 0 ? "+" : ""}{lastGain.price}pp, contato {lastGain.contact >= 0 ? "+" : ""}{lastGain.contact}pp
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Donut value={pricePct} label="Preco" />
              <Donut value={contactPct} label="Contato" color="#16a34a" />
              <div className="flex flex-col gap-2 text-xs w-full">
                <div className="flex justify-between">
                  <span>Batch pos-processo</span>
                  <Input
                    className="h-8 w-16"
                    type="number"
                    min={1}
                    max={10}
                    value={postBatchSize}
                    onChange={(e) => setPostBatchSize(parseInt(e.target.value || "1", 10))}
                  />
                </div>
                <div className="flex justify-between">
                  <span>Timeout (ms)</span>
                  <Input
                    className="h-8 w-24"
                    type="number"
                    min={10000}
                    max={180000}
                    value={postTimeout}
                    onChange={(e) => setPostTimeout(parseInt(e.target.value || "90000", 10))}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span>Prioridade do pos-processo</span>
                  <Select value={postPriority} onValueChange={(v) => setPostPriority(v as PostprocessPriority)}>
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="auto-postprocess-card" checked={autoPostprocess} onCheckedChange={setAutoPostprocess} />
                  <label htmlFor="auto-postprocess-card">Rodar pos-processo ate 95%</label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Alvo minimo: 95%. Pos-processamento roda em segundo plano enquanto abaixo do alvo.
                </p>
                {postprocessEvents.length > 0 && (
                  <div className="rounded-md border p-2 bg-muted/40">
                    <p className="text-[11px] font-medium mb-1">Ultimos ciclos</p>
                    {postprocessEvents.map((event) => (
                      <p key={event} className="text-[11px] text-muted-foreground">{event}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                          <div className="flex flex-col gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/leads/${lead.id}`}>Ver Detalhes</a>
                            </Button>
                            {lead.ad?.url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={lead.ad.url} target="_blank" rel="noreferrer">Link Original</a>
                              </Button>
                            )}
                          </div>
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

function Donut({ value, label, color = "#2563eb" }: { value: number; label: string; color?: string }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="64" height="64">
        <circle cx="32" cy="32" r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div className="text-sm font-semibold mt-1">{clamped}%</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

