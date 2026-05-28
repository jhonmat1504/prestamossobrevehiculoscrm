import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <AuthScreen />;
  return <>{children}</>;
}

function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) toast.error(error);
    else toast.success("Bienvenido");
  };
  const onSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    setSubmitting(true);
    const { error } = await signUp(email, password, nombre);
    setSubmitting(false);
    if (error) toast.error(error);
    else toast.success("Cuenta creada. Verifica tu correo e inicia sesión.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">F</div>
          <div>
            <CardTitle className="text-2xl">Freddy CRM</CardTitle>
            <CardDescription>Compra y Venta de Vehículos · Cero papel <Leaf className="inline h-3 w-3 text-eco" /></CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={onLogin} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="li-email">Correo</Label>
                  <Input id="li-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="li-pass">Contraseña</Label>
                  <Input id="li-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={onSignup} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="su-nombre">Nombre completo</Label>
                  <Input id="su-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Correo</Label>
                  <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pass">Contraseña</Label>
                  <Input id="su-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear cuenta
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  El primer usuario registrado recibe el rol de <span className="font-medium">Administrador</span>.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
