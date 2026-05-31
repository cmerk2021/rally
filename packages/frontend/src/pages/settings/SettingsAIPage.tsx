import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/primitives";
import { FormField } from "@/components/shared/FormField";
import { Skeleton } from "@/components/ui/skeleton";
import { settingsApi } from "@/api";

export function SettingsAIPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: () => settingsApi.get() });
  const [enabled, setEnabled] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setEnabled(data.ai_enabled);
      setEndpoint(data.ai_endpoint);
      setModel(data.ai_model);
      setTemperature(data.ai_temperature);
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => settingsApi.update({
      ai_enabled: enabled,
      ai_endpoint: endpoint,
      ai_model: model,
      ai_temperature: temperature,
      ...(apiKey ? { ai_api_key: apiKey } : {}),
    }),
    onSuccess: () => {
      toast.success("AI settings saved");
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["ai", "status"] });
    },
  });

  const testMut = useMutation({
    mutationFn: () => settingsApi.testAI({ endpoint, api_key: apiKey || undefined, model }),
    onSuccess: (res) => {
      setTestResult(res.ok ? `OK in ${res.latencyMs}ms — ${res.sample ?? ""}` : res.message);
      if (res.ok) toast.success("Connection OK");
      else toast.error(res.message);
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setTestResult(msg ?? "Failed");
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  return (
    <Card className="max-w-2xl">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium">Enable AI assistance</div>
            <div className="text-xs text-muted-foreground">OpenAI-compatible endpoints supported</div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <FormField label="Endpoint URL">
          <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="http://localhost:11434/v1" />
        </FormField>
        <FormField label="API key" hint={data?.ai_api_key_set ? "A key is currently set. Leave empty to keep." : "Optional for local providers"}>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={data?.ai_api_key_set ? "•••••••••" : "sk-…"} />
        </FormField>
        <FormField label="Model"><Input value={model} onChange={(e) => setModel(e.target.value)} /></FormField>
        <FormField label="Temperature">
          <Input type="number" step="0.1" min={0} max={2} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
        </FormField>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
              {testMut.isPending ? "Testing…" : "Test connection"}
            </Button>
            {testResult && <span className="text-sm text-muted-foreground">{testResult}</span>}
          </div>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
