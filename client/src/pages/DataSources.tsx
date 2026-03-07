import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Settings } from "lucide-react";
import { toast } from "sonner";

interface DataSource {
  source: string;
  name: string;
  enabled: boolean;
  config: {
    minDelayMs: number;
    maxDelayMs: number;
    timeout: number;
    maxRetries: number;
  };
}

export default function DataSources() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for now - in production, fetch from API
  const mockSources: DataSource[] = [
    {
      source: "olx",
      name: "OLX",
      enabled: true,
      config: {
        minDelayMs: 2000,
        maxDelayMs: 5000,
        timeout: 15000,
        maxRetries: 3,
      },
    },
    {
      source: "mercado_livre",
      name: "Mercado Livre",
      enabled: true,
      config: {
        minDelayMs: 2000,
        maxDelayMs: 5000,
        timeout: 15000,
        maxRetries: 3,
      },
    },
    {
      source: "webmotors",
      name: "Webmotors",
      enabled: true,
      config: {
        minDelayMs: 2000,
        maxDelayMs: 5000,
        timeout: 15000,
        maxRetries: 3,
      },
    },
    {
      source: "icarros",
      name: "iCarros",
      enabled: true,
      config: {
        minDelayMs: 2000,
        maxDelayMs: 5000,
        timeout: 15000,
        maxRetries: 3,
      },
    },
    {
      source: "socarrao",
      name: "SóCarrão",
      enabled: true,
      config: {
        minDelayMs: 2000,
        maxDelayMs: 5000,
        timeout: 15000,
        maxRetries: 3,
      },
    },
  ];

  const handleToggleSource = (source: string) => {
    setSources(
      sources.map((s) =>
        s.source === source ? { ...s, enabled: !s.enabled } : s
      )
    );
    toast.success("Fonte atualizada!");
  };

  const handleAddSource = () => {
    toast.info("Adicionar nova fonte - em desenvolvimento");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Fontes de Dados</h1>
          <Button onClick={handleAddSource}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Fonte
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fontes Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockSources.map((source) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{source.name}</h3>
                      <Badge variant={source.enabled ? "default" : "secondary"}>
                        {source.enabled ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Delay: {source.config.minDelayMs}-{source.config.maxDelayMs}ms |
                      Timeout: {source.config.timeout}ms |
                      Retries: {source.config.maxRetries}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <Switch
                      checked={source.enabled}
                      onCheckedChange={() => handleToggleSource(source.source)}
                    />
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações Globais de Scraping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Delay Mínimo (ms)</label>
              <input
                type="number"
                defaultValue="2000"
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Delay Máximo (ms)</label>
              <input
                type="number"
                defaultValue="5000"
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Timeout (ms)</label>
              <input
                type="number"
                defaultValue="15000"
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Máximo de Retentativas</label>
              <input
                type="number"
                defaultValue="3"
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="respectRobots"
                defaultChecked
                className="w-4 h-4"
              />
              <label htmlFor="respectRobots" className="text-sm font-medium">
                Respeitar robots.txt
              </label>
            </div>
            <Button className="w-full">Salvar Configurações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comportamento Ético de Scraping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              ✓ <strong>Delays Aleatórios:</strong> Aguarda entre 2-5 segundos entre requisições
            </p>
            <p>
              ✓ <strong>User-Agent Rotation:</strong> Alterna entre diferentes navegadores
            </p>
            <p>
              ✓ <strong>Respeito a robots.txt:</strong> Verifica permissões antes de coletar
            </p>
            <p>
              ✓ <strong>Retry com Backoff:</strong> Aguarda progressivamente antes de repetir
            </p>
            <p>
              ✓ <strong>Limite de Requisições:</strong> Máximo de 3 tentativas por página
            </p>
            <p>
              ✓ <strong>Identificação:</strong> User-Agent identifica como scraper responsável
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
