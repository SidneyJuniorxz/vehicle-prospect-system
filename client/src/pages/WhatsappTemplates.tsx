import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const statuses = [
    { id: 'new', label: 'Novo (Sem Contato)' },
    { id: 'in_progress', label: 'Em Andamento (Aguardando Resposta)' },
    { id: 'reviewed', label: 'Analisado / Processado' },
    { id: 'approved', label: 'Aprovado / Qualificado' }
];

export default function WhatsappTemplates() {
    const [activeStatus, setActiveStatus] = useState(statuses[0].id);
    const [templateContent, setTemplateContent] = useState("");

    const templatesQuery = trpc.whatsapp.getTemplates.useQuery();
    const saveMutation = trpc.whatsapp.saveTemplate.useMutation({
        onSuccess: () => {
            toast.success("Template salvo com sucesso!");
            templatesQuery.refetch();
        },
        onError: (e) => {
            toast.error(`Erro ao salvar template: ${e.message}`);
        }
    });

    useEffect(() => {
        if (templatesQuery.data) {
            const tpl = templatesQuery.data.find(t => t.status === activeStatus);
            setTemplateContent(tpl ? tpl.message : "");
        }
    }, [activeStatus, templatesQuery.data]);

    const handleSave = () => {
        saveMutation.mutate({
            status: activeStatus,
            message: templateContent,
        });
    };

    const insertVariable = (variable: string) => {
        setTemplateContent(prev => prev + ` {{${variable}}}`);
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-heading bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Respostas Rápidas do WhatsApp
                </h1>
                <p className="text-muted-foreground mt-2">
                    Configure a mensagem padrão que será enviada para o vendedor de acordo com o status atual do card/prospecção.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-2">
                    <div className="font-semibold mb-3">Selecione o Status:</div>
                    {statuses.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveStatus(s.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${activeStatus === s.id
                                ? "bg-primary text-primary-foreground border-primary shadow-md"
                                : "bg-card hover:bg-accent/50 border-border"
                                }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="md:col-span-3 space-y-4">
                    <div className="bg-card border rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-lg">
                                Mensagem Padrão: {statuses.find(s => s.id === activeStatus)?.label}
                            </h2>
                        </div>

                        <Textarea
                            value={templateContent}
                            onChange={(e) => setTemplateContent(e.target.value)}
                            placeholder="Digite a mensagem padrão aqui..."
                            className="min-h-[200px] mb-4 text-base resize-y"
                        />

                        <div className="flex flex-col gap-3">
                            <span className="text-sm font-medium text-muted-foreground">Variáveis dinâmicas (clique para inserir):</span>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'veiculo', label: 'Nome do Veículo' },
                                    { id: 'preco', label: 'Preço Formatado' },
                                    { id: 'ano', label: 'Ano' },
                                    { id: 'km', label: 'Quilometragem' },
                                    { id: 'cidade', label: 'Cidade' }
                                ].map(v => (
                                    <Button
                                        key={v.id}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => insertVariable(v.id)}
                                    >
                                        +{'{'}{v.id}{'}'}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button onClick={handleSave} disabled={saveMutation.isPending} className="px-8 shadow-md">
                                <Save className="w-4 h-4 mr-2" />
                                {saveMutation.isPending ? "Salvando..." : "Salvar Template"}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
                        <strong>Como funciona:</strong> Ao abrir os detalhes de um veículo ou clicar no botão "WhatsApp", o sistema pegará a mensagem salva acima, substituirá as variávies <code>{'{veiculo}'}</code> pelas informações reais do anúncio, e abrirá o WhatsApp Web já com o texto preenchido, pronto para enviar!
                    </div>
                </div>
            </div>
        </div>
    );
}
