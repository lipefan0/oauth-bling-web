"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/oauth/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientId, clientSecret }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error ?? "Falha ao iniciar o fluxo de autorização."
        );
      }

      const { authorizeUrl } = await response.json();

      if (!authorizeUrl) {
        throw new Error("URL de autorização ausente na resposta.");
      }

      window.location.href = authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Gerar token do Bling</CardTitle>
          <CardDescription>
            Informe as credenciais da sua aplicação para abrir a tela de
            autorização.
            <span className="mt-2 block text-sm">
              Utilize essa url para redirecionamento:
              <code className="ml-1 font-mono">
                https://oauth-bling-web.vercel.app/oauth/redirect
              </code>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                name="clientId"
                placeholder="Digite o clientId"
                autoComplete="off"
                required
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                name="clientSecret"
                type="password"
                placeholder="Digite o clientSecret"
                autoComplete="off"
                required
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Redirecionando..." : "Gerar token"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
