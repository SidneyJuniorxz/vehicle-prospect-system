import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Play, Pause } from "lucide-react";
import { toast } from "sonner";

interface ScheduledJob {
  id: number;
  name: string;
  cronExpression: string;
  sources: string[];
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export default function JobScheduling() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([
    {
      id: 1,
      name: "Coleta Diária - OLX SP",
      cronExpression: "0 0 * * *",
      sources: ["olx"],
      enabled: true,
      lastRun: "2026-03-06 23:00:00",
      nextRun: "2026-03-07 00:00:00",
    },
    {
      id: 2,
      name: "Coleta 6h - Todas as Fontes",
      cronExpression: "0 */6 * * *",
      sources: ["olx", "mercado_livre", "webmotors", "icarros"],
      enabled: true,
      lastRun: "2026-03-06 18:00:00",
      nextRun: "2026-03-07 00:00:00",
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cronExpression: "0 0 * * *",
    sources: ["olx"],
  });

  const handleAddJob = () => {
    if (!formData.name || !formData.cronExpression) {
      toast.error("Preencha todos os campos");
      return;
    }

    const newJob: ScheduledJob = {
      id: Math.max(...jobs.map((j) => j.id), 0) + 1,
      ...formData,
      enabled: true,
      lastRun: undefined,
      nextRun: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    setJobs([...jobs, newJob]);
    setFormData({ name: "", cronExpression: "0 0 * * *", sources: ["olx"] });
    setShowForm(false);
    toast.success("Job agendado com sucesso!");
  };

  const handleToggleJob = (id: number) => {
    setJobs(
      jobs.map((j) => (j.id === id ? { ...j, enabled: !j.enabled } : j))
    );
    toast.success("Status do job atualizado");
  };

  const handleDeleteJob = (id: number) => {
    setJobs(jobs.filter((j) => j.id !== id));
    toast.success("Job removido");
  };

  const cronExpressionExamples = [
    { label: "Diariamente às 00:00", value: "0 0 * * *" },
    { label: "A cada 6 horas", value: "0 */6 * * *" },
    { label: "A cada 12 horas", value: "0 */12 * * *" },
    { label: "Segunda a sexta às 08:00", value: "0 8 * * 1-5" },
    { label: "A cada hora", value: "0 * * * *" },
    { label: "A cada 30 minutos", value: "*/30 * * * *" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Agendamento de Coletas</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Criar Novo Agendamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Job</label>
                <input
                  type="text"
                  placeholder="Ex: Coleta Diária - OLX"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Expressão Cron</label>
                <select
                  value={formData.cronExpression}
                  onChange={(e) =>
                    setFormData({ ...formData, cronExpression: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  {cronExpressionExamples.map((ex) => (
                    <option key={ex.value} value={ex.value}>
                      {ex.label} ({ex.value})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Formato: minuto hora dia mês dia-da-semana
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Fontes de Dados</label>
                <div className="mt-2 space-y-2">
                  {[
                    { id: "olx", label: "OLX" },
                    { id: "mercado_livre", label: "Mercado Livre" },
                    { id: "webmotors", label: "Webmotors" },
                    { id: "icarros", label: "iCarros" },
                    { id: "socarrao", label: "SóCarrão" },
                  ].map((source) => (
                    <label key={source.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.sources.includes(source.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              sources: [...formData.sources, source.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              sources: formData.sources.filter(
                                (s) => s !== source.id
                              ),
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{source.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddJob} className="flex-1">
                  Criar Agendamento
                </Button>
                <Button
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Jobs Agendados</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-gray-500">Nenhum job agendado</p>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{job.name}</h3>
                        <Badge variant={job.enabled ? "default" : "secondary"}>
                          {job.enabled ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Cron: {job.cronExpression}
                      </p>
                      <p className="text-sm text-gray-600">
                        Fontes: {job.sources.join(", ")}
                      </p>
                      {job.lastRun && (
                        <p className="text-xs text-gray-500 mt-1">
                          Última execução: {job.lastRun}
                        </p>
                      )}
                      {job.nextRun && (
                        <p className="text-xs text-gray-500">
                          Próxima execução: {job.nextRun}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleJob(job.id)}
                      >
                        {job.enabled ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteJob(job.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referência de Expressões Cron</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Formato:</strong> minuto hora dia mês dia-da-semana
            </p>
            <div className="space-y-2 text-gray-600">
              <p>• <code className="bg-gray-100 px-2 py-1 rounded">0 0 * * *</code> - Diariamente à meia-noite</p>
              <p>• <code className="bg-gray-100 px-2 py-1 rounded">0 */6 * * *</code> - A cada 6 horas</p>
              <p>• <code className="bg-gray-100 px-2 py-1 rounded">0 8 * * 1-5</code> - Seg-Sex às 08:00</p>
              <p>• <code className="bg-gray-100 px-2 py-1 rounded">*/30 * * * *</code> - A cada 30 minutos</p>
              <p>• <code className="bg-gray-100 px-2 py-1 rounded">0 0 1 * *</code> - Primeiro dia do mês</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
