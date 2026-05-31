import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { Skeleton } from "@/components/ui/skeleton";
import { settingsApi } from "@/api";

export function SettingsGeneralPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: () => settingsApi.get() });
  const [homelabName, setHomelabName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [dateFormat, setDateFormat] = useState("");

  useEffect(() => {
    if (data) {
      setHomelabName(data.homelab_name);
      setTimezone(data.timezone);
      setDateFormat(data.date_format);
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => settingsApi.update({ homelab_name: homelabName, timezone, date_format: dateFormat }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  return (
    <Card className="max-w-2xl">
      <CardContent className="p-6 space-y-4">
        <FormField label="Homelab name"><Input value={homelabName} onChange={(e) => setHomelabName(e.target.value)} /></FormField>
        <FormField label="Timezone"><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} /></FormField>
        <FormField label="Date format" hint="e.g. yyyy-MM-dd"><Input value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} /></FormField>
        <div className="flex justify-end">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
