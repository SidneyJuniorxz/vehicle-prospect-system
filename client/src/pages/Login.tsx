import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.localLogin.useMutation({
    onSuccess: (data: any) => {
      console.log("=== LOGIN MUTATION SUCCESS ===", data);
      if (data.success) {
        if (data.token) {
          console.log("=== SAVING TOKEN TO LOCALSTORAGE ===", data.token.substring(0, 15) + '...');
          localStorage.setItem('auth_token', data.token);
        } else {
          console.error("=== NO TOKEN IN SUCCESS RESPONSE! ===");
        }
        alert("LOGIN BEM SUCEDIDO! Se a tela voltar para cá depois desse aviso, o problema é no carregamento do Dashboard.");
        window.location.href = "/dashboard";
      } else {
        console.error("=== LOGIN RETURNED SUCCESS: FALSE ===", data);
        alert("Falha no login: " + (data.message || "Erro desconhecido"));
        setError(data.message || "Login failed");
      }
    },
    onError: (error: any) => {
      console.error("=== LOGIN MUTATION ONERROR ===", error);
      alert("ERRO NA REQUISIÇÃO: " + error.message);
      setError(error.message || "An error occurred");
    },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log("=== SUBMIT CLICKED ===", { email, passwordLength: password.length });
    setError("");
    setIsLoading(true);

    try {
      console.log("=== CALLING MUTATION ===");
      await loginMutation.mutateAsync({ email, password });
      console.log("=== MUTATION AWAIT FINISHED ===");
    } catch (err) {
      console.error("=== CATCH BLOCK HIT ===", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Vehicle Prospect System</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/register")}
              disabled={isLoading}
            >
              Create Account
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Demo credentials:</p>
            <p className="font-mono text-xs mt-2">
              admin@example.com / password123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
