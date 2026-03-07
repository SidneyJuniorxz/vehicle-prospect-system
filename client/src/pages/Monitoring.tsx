import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

interface ScraperHealth {
  source: string;
  name: string;
  enabled: boolean;
  status: "healthy" | "warning" | "error";
  lastCheck: string;
  errorCount: number;
  successCount: number;
  averageResponseTime: number;
  uptime: number;
}

interface Alert {
  severity: "info" | "warning" | "error";
  source: string;
  message: string;
  timestamp: string;
}

export default function Monitoring() {
  const [scrapers, setScrapers] = useState<ScraperHealth[]>([
    {
      source: "olx",
      name: "OLX",
      enabled: true,
      status: "healthy",
      lastCheck: new Date().toISOString(),
      errorCount: 0,
      successCount: 24,
      averageResponseTime: 2345,
      uptime: 100,
    },
    {
      source: "mercado_livre",
      name: "Mercado Livre",
      enabled: true,
      status: "healthy",
      lastCheck: new Date().toISOString(),
      errorCount: 1,
      successCount: 23,
      averageResponseTime: 2890,
      uptime: 95.8,
    },
    {
      source: "webmotors",
      name: "Webmotors",
      enabled: true,
      status: "warning",
      lastCheck: new Date().toISOString(),
      errorCount: 4,
      successCount: 20,
      averageResponseTime: 4567,
      uptime: 83.3,
    },
    {
      source: "icarros",
      name: "iCarros",
      enabled: true,
      status: "healthy",
      lastCheck: new Date().toISOString(),
      errorCount: 0,
      successCount: 24,
      averageResponseTime: 2100,
      uptime: 100,
    },
    {
      source: "socarrao",
      name: "SóCarrão",
      enabled: true,
      status: "error",
      lastCheck: new Date().toISOString(),
      errorCount: 8,
      successCount: 16,
      averageResponseTime: 5234,
      uptime: 66.7,
    },
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      severity: "error",
      source: "SóCarrão",
      message: "Scraper SóCarrão está com taxa de erro alta (33.3%)",
      timestamp: new Date().toISOString(),
    },
    {
      severity: "warning",
      source: "Webmotors",
      message: "Tempo de resposta alto para Webmotors (4567ms)",
      timestamp: new Date().toISOString(),
    },
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const healthyCount = scrapers.filter((s) => s.status === "healthy").length;
  const warningCount = scrapers.filter((s) => s.status === "warning").length;
  const errorCount = scrapers.filter((s) => s.status === "error").length;

  const totalSuccesses = scrapers.reduce((sum, s) => sum + s.successCount, 0);
  const totalErrors = scrapers.reduce((sum, s) => sum + s.errorCount, 0);
  const avgResponseTime =
    scrapers.reduce((sum, s) => sum + s.averageResponseTime, 0) / scrapers.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Monitoramento de Scrapers</h1>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">{healthyCount}</p>
                <p className="text-sm text-gray-600">Saudáveis</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">{warningCount}</p>
                <p className="text-sm text-gray-600">Aviso</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">{errorCount}</p>
                <p className="text-sm text-gray-600">Erro</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">{totalSuccesses}</p>
                <p className="text-sm text-gray-600">Coletas OK</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Alertas Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50"
                  >
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1">
                      <p className="font-medium">{alert.source}</p>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        alert.severity === "error"
                          ? "destructive"
                          : alert.severity === "warning"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scraper Health Details */}
        <Card>
          <CardHeader>
            <CardTitle>Status Detalhado dos Scrapers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scrapers.map((scraper) => (
                <div
                  key={scraper.source}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(scraper.status)}
                    <div>
                      <h3 className="font-semibold">{scraper.name}</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          Taxa de sucesso:{" "}
                          <span className="font-medium">
                            {scraper.uptime.toFixed(1)}%
                          </span>
                        </p>
                        <p>
                          Tempo médio:{" "}
                          <span className="font-medium">
                            {scraper.averageResponseTime.toFixed(0)}ms
                          </span>
                        </p>
                        <p>
                          Coletas: {scraper.successCount} OK, {scraper.errorCount} erro
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge
                      variant={
                        scraper.status === "healthy"
                          ? "default"
                          : scraper.status === "warning"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {scraper.status === "healthy"
                        ? "Saudável"
                        : scraper.status === "warning"
                          ? "Aviso"
                          : "Erro"}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-2">
                      Última verificação:{" "}
                      {new Date(scraper.lastCheck).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total de Coletas</p>
                <p className="text-2xl font-bold">{totalSuccesses + totalErrors}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Taxa de Sucesso Geral</p>
                <p className="text-2xl font-bold">
                  {(
                    (totalSuccesses / (totalSuccesses + totalErrors)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tempo Médio de Resposta</p>
                <p className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
