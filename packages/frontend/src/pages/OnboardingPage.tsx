import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import Confetti from "react-confetti";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Check, Sparkles, Server, HardDrive, FolderKanban, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/primitives";
import { authApi, settingsApi, servicesApi, assetsApi, projectsApi } from "@/api";
import { useAuthStore } from "@/stores/auth.store";

interface AccountState {
  username: string;
  display_name: string;
  email: string;
  password: string;
  password_confirm: string;
  homelab_name: string;
  timezone: string;
}

interface AIState {
  ai_enabled: boolean;
  ai_endpoint: string;
  ai_api_key: string;
  ai_model: string;
}

interface SeedItem {
  name: string;
  type?: string;
  description?: string;
  enabled: boolean;
}

const stepTitles = [
  "Welcome",
  "Create your account",
  "Configure AI (optional)",
  "Add your first services",
  "Add your first assets",
  "Add your first projects",
  "All set",
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [account, setAccount] = useState<AccountState>({
    username: "",
    display_name: "",
    email: "",
    password: "",
    password_confirm: "",
    homelab_name: "My Homelab",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [ai, setAI] = useState<AIState>({
    ai_enabled: false,
    ai_endpoint: "http://localhost:11434/v1",
    ai_api_key: "",
    ai_model: "llama3.1",
  });
  const [aiTestResult, setAITestResult] = useState<string | null>(null);

  const [services, setServices] = useState<SeedItem[]>([
    { name: "Plex", description: "Media server", enabled: false },
    { name: "Home Assistant", description: "Home automation", enabled: false },
    { name: "Pi-hole", description: "Network-wide ad blocker", enabled: false },
    { name: "Nextcloud", description: "Self-hosted cloud storage", enabled: false },
  ]);
  const [customServiceName, setCustomServiceName] = useState("");

  const [assets, setAssets] = useState<SeedItem[]>([
    { name: "Main Server", type: "server", enabled: false },
    { name: "NAS", type: "nas", enabled: false },
    { name: "Router", type: "router", enabled: false },
    { name: "Raspberry Pi", type: "rpi", enabled: false },
  ]);
  const [customAssetName, setCustomAssetName] = useState("");

  const [projects, setProjects] = useState<SeedItem[]>([
    { name: "Home Network Improvements", description: "Tracking network upgrades", enabled: false },
    { name: "Media Stack Migration", description: "Move services to new host", enabled: false },
  ]);
  const [customProjectName, setCustomProjectName] = useState("");

  // Redirect if already setup
  useEffect(() => {
    void (async () => {
      try {
        const status = await authApi.setupStatus();
        if (!status.setupRequired) {
          void navigate({ to: "/login" });
        }
      } catch {
        // assume needed
      }
    })();
  }, [navigate]);

  // Window dimensions for confetti
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const canAdvance = () => {
    if (step === 1) {
      const usernameOk = /^[a-zA-Z0-9_-]{3,32}$/.test(account.username);
      return (
        usernameOk &&
        account.display_name.trim().length > 0 &&
        account.password.length >= 8 &&
        account.password === account.password_confirm
      );
    }
    return true;
  };

  const next = () => setStep((s) => Math.min(s + 1, stepTitles.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const testAI = async () => {
    setAITestResult(null);
    try {
      const res = await settingsApi.testAI({
        endpoint: ai.ai_endpoint,
        api_key: ai.ai_api_key || undefined,
        model: ai.ai_model,
      });
      setAITestResult(res.ok ? `Success in ${res.latencyMs}ms` : res.message);
      if (res.ok) toast.success("AI connection successful");
      else toast.error(res.message);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setAITestResult(msg ?? "Connection failed");
      toast.error(msg ?? "Connection failed");
    }
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      const setupRes = await authApi.setup({
        username: account.username,
        display_name: account.display_name,
        password: account.password,
        email: account.email || undefined,
        homelab_name: account.homelab_name,
        timezone: account.timezone,
      });
      setSession(setupRes.token, setupRes.user);

      if (ai.ai_enabled) {
        await settingsApi.update({
          ai_enabled: true,
          ai_endpoint: ai.ai_endpoint,
          ai_api_key: ai.ai_api_key,
          ai_model: ai.ai_model,
          homelab_name: account.homelab_name,
          timezone: account.timezone,
          onboarding_completed: true,
        });
      } else {
        await settingsApi.update({
          homelab_name: account.homelab_name,
          timezone: account.timezone,
          onboarding_completed: true,
        });
      }

      // Seed selected/custom items
      const seedTasks: Promise<unknown>[] = [];
      for (const s of services) if (s.enabled) seedTasks.push(servicesApi.create({ name: s.name, description: s.description ?? "", category: "other", status: "unknown" }));
      if (customServiceName.trim()) seedTasks.push(servicesApi.create({ name: customServiceName.trim(), category: "other", status: "unknown" }));
      for (const a of assets) if (a.enabled) seedTasks.push(assetsApi.create({ name: a.name, type: a.type as never, status: "unknown" }));
      if (customAssetName.trim()) seedTasks.push(assetsApi.create({ name: customAssetName.trim(), type: "other", status: "unknown" }));
      for (const p of projects) if (p.enabled) seedTasks.push(projectsApi.create({ name: p.name, description: p.description ?? "", status: "active" }));
      if (customProjectName.trim()) seedTasks.push(projectsApi.create({ name: customProjectName.trim(), status: "active" }));
      await Promise.allSettled(seedTasks);

      setShowConfetti(true);
      toast.success("Welcome to Rally!");
      setTimeout(() => {
        void navigate({ to: "/dashboard" });
      }, 2200);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? "Setup failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      {showConfetti && <Confetti width={size.w} height={size.h} recycle={false} numberOfPieces={300} />}
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {stepTitles.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/60" : "w-4 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              {step === 0 && (
                <div className="text-center py-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight">Welcome to Rally</h1>
                  <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                    Your self-hosted homelab operations and project management platform. Let&apos;s get you set up — this takes about 2 minutes.
                  </p>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="text-xl font-semibold">Create your account</h2>
                  <p className="mt-1 text-sm text-muted-foreground">You&apos;ll be the owner of this Rally instance.</p>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="username">Username *</Label>
                      <Input id="username" value={account.username} onChange={(e) => setAccount({ ...account, username: e.target.value })} placeholder="admin" />
                      <p className="text-xs text-muted-foreground">3–32 chars, letters, numbers, _ or -</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="display_name">Display name *</Label>
                      <Input id="display_name" value={account.display_name} onChange={(e) => setAccount({ ...account, display_name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="homelab_name">Homelab name</Label>
                      <Input id="homelab_name" value={account.homelab_name} onChange={(e) => setAccount({ ...account, homelab_name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Password *</Label>
                      <Input id="password" type="password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
                      <p className="text-xs text-muted-foreground">Min 8 characters</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password_confirm">Confirm password *</Label>
                      <Input id="password_confirm" type="password" value={account.password_confirm} onChange={(e) => setAccount({ ...account, password_confirm: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-xl font-semibold">Configure AI (optional)</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Connect any OpenAI-compatible endpoint — Ollama, LM Studio, OpenAI, etc.</p>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">Enable AI assistance</div>
                        <div className="text-xs text-muted-foreground">Smart summaries, relationship hints, doc suggestions</div>
                      </div>
                      <Switch checked={ai.ai_enabled} onCheckedChange={(v: boolean) => setAI({ ...ai, ai_enabled: v })} />
                    </div>
                    {ai.ai_enabled && (
                      <>
                        <div className="space-y-1.5">
                          <Label>Endpoint URL</Label>
                          <Input value={ai.ai_endpoint} onChange={(e) => setAI({ ...ai, ai_endpoint: e.target.value })} placeholder="http://localhost:11434/v1" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>API key (optional)</Label>
                          <Input type="password" value={ai.ai_api_key} onChange={(e) => setAI({ ...ai, ai_api_key: e.target.value })} placeholder="sk-…" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Model</Label>
                          <Input value={ai.ai_model} onChange={(e) => setAI({ ...ai, ai_model: e.target.value })} placeholder="llama3.1" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" onClick={testAI}>Test connection</Button>
                          {aiTestResult && <span className="text-sm text-muted-foreground">{aiTestResult}</span>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <SeedStep
                  title="Add your first services"
                  description="Toggle the services you run. Or add a custom one."
                  icon={<Server className="h-5 w-5" />}
                  items={services}
                  onToggle={(i, v) => setServices((s) => s.map((it, idx) => idx === i ? { ...it, enabled: v } : it))}
                  customValue={customServiceName}
                  onCustomChange={setCustomServiceName}
                  customPlaceholder="e.g. Grafana"
                />
              )}

              {step === 4 && (
                <SeedStep
                  title="Add your first assets"
                  description="The physical or virtual hardware in your lab."
                  icon={<HardDrive className="h-5 w-5" />}
                  items={assets}
                  onToggle={(i, v) => setAssets((s) => s.map((it, idx) => idx === i ? { ...it, enabled: v } : it))}
                  customValue={customAssetName}
                  onCustomChange={setCustomAssetName}
                  customPlaceholder="e.g. Synology DS920+"
                />
              )}

              {step === 5 && (
                <SeedStep
                  title="Add your first projects"
                  description="Group related tasks and changes under a project."
                  icon={<FolderKanban className="h-5 w-5" />}
                  items={projects}
                  onToggle={(i, v) => setProjects((s) => s.map((it, idx) => idx === i ? { ...it, enabled: v } : it))}
                  customValue={customProjectName}
                  onCustomChange={setCustomProjectName}
                  customPlaceholder="e.g. Migrate to Proxmox"
                />
              )}

              {step === 6 && (
                <div className="text-center py-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/20 text-green-500">
                    <Check className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">You&apos;re all set</h2>
                  <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                    We&apos;ll create your account, save your settings, and seed any services, assets, and projects you selected.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2 text-sm">
                    <SettingsIcon className="h-3.5 w-3.5" />
                    You can change everything later in Settings
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={prev} disabled={step === 0 || submitting}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div className="text-xs text-muted-foreground">
              Step {step + 1} of {stepTitles.length}
            </div>
            {step < stepTitles.length - 1 ? (
              <Button onClick={next} disabled={!canAdvance()}>
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={submitting}>
                {submitting ? "Setting up…" : "Finish"}
                <Check className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SeedStepProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: SeedItem[];
  onToggle: (index: number, value: boolean) => void;
  customValue: string;
  onCustomChange: (value: string) => void;
  customPlaceholder: string;
}

function SeedStep({ title, description, icon, items, onToggle, customValue, onCustomChange, customPlaceholder }: SeedStepProps) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, i) => (
          <button
            type="button"
            key={item.name}
            onClick={() => onToggle(i, !item.enabled)}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              item.enabled ? "border-primary bg-primary/5" : "hover:bg-accent"
            }`}
          >
            <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${item.enabled ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
              {item.enabled && <Check className="h-3 w-3" />}
            </div>
            <div className="min-w-0">
              <div className="font-medium">{item.name}</div>
              {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        <Label>Or add a custom one</Label>
        <Input value={customValue} onChange={(e) => onCustomChange(e.target.value)} placeholder={customPlaceholder} />
      </div>
    </div>
  );
}
