"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type FetchStatus = "idle" | "loading" | "success" | "error";

type ErrorResponse = {
  error?: string;
} & Record<string, unknown>;

type TokenResponse = Record<string, unknown>;

type TokenInfo = {
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
};

function RedirectFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Token OAuth</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Carregando redirecionamento...
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function OAuthRedirectContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const hasValidParams = code && state;

  const [status, setStatus] = useState<FetchStatus>(
    hasValidParams ? "idle" : "error",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasValidParams ? null : "Parâmetros code e state não encontrados na URL.",
  );
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !state) {
      return;
    }

    let active = true;

    const run = async () => {
      setStatus("loading");
      setErrorMessage(null);
      setTokenInfo(null);

      try {
        const response = await fetch("/api/oauth/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, state }),
        });

        const payload: ErrorResponse = await response.json().catch(() => ({
          error: "Não foi possível interpretar a resposta do servidor.",
        }));

        if (!active) {
          return;
        }

        if (!response.ok) {
          setStatus("error");
          setErrorMessage(
            typeof payload.error === "string"
              ? payload.error
              : "Falha ao obter o token. Verifique as credenciais e tente novamente.",
          );
          return;
        }

        setStatus("success");
        const data = payload as TokenResponse;
        const token = data?.access_token;
        const refresh = data?.refresh_token;
        const expires = Number(data?.expires_in);

        if (typeof token === "string" && token) {
          setTokenInfo({
            accessToken: token,
            expiresIn: Number.isFinite(expires) ? expires : undefined,
            refreshToken:
              typeof refresh === "string" && refresh ? refresh : undefined,
          });
        } else {
          setErrorMessage(
            "Resposta sem access_token. Verifique as credenciais.",
          );
          setStatus("error");
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erro inesperado ao buscar o token.",
        );
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [code, state]);

  const [currentTime] = useState(() => Date.now());

  const expiresLabel = useMemo(() => {
    const seconds = tokenInfo?.expiresIn;

    if (!seconds || !Number.isFinite(seconds)) {
      return null;
    }

    const expiresAt = new Date(currentTime + seconds * 1000);

    const formatted = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(expiresAt);

    return `Expira em ${formatted} (fuso horário local).`;
  }, [tokenInfo, currentTime]);

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 2000);
    } catch (error) {
      setCopiedLabel(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível copiar o token.",
      );
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Token OAuth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" ? (
            <p className="text-sm text-muted-foreground">Gerando token...</p>
          ) : null}

          {status === "error" && errorMessage ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {status === "success" && tokenInfo ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">
                    Access token
                  </p>
                  <code className="break-all text-sm text-foreground">
                    {tokenInfo.accessToken}
                  </code>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    handleCopy(tokenInfo.accessToken, "Access token copiado.")
                  }
                  title="Copiar access_token"
                >
                  <Copy className="size-4" />
                  <span className="sr-only">Copiar access_token</span>
                </Button>
              </div>
              {tokenInfo.refreshToken ? (
                <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 p-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase text-muted-foreground">
                      Refresh token
                    </p>
                    <code className="break-all text-sm text-foreground">
                      {tokenInfo.refreshToken}
                    </code>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      handleCopy(
                        tokenInfo.refreshToken as string,
                        "Refresh token copiado.",
                      )
                    }
                    title="Copiar refresh_token"
                  >
                    <Copy className="size-4" />
                    <span className="sr-only">Copiar refresh_token</span>
                  </Button>
                </div>
              ) : null}
              {expiresLabel ? (
                <span className="text-sm text-muted-foreground">
                  {expiresLabel}
                </span>
              ) : null}
              {copiedLabel ? (
                <span className="text-sm text-emerald-600">{copiedLabel}</span>
              ) : null}
            </div>
          ) : null}

          <Button asChild variant="secondary" className="w-full">
            <Link href="/">Voltar para o início</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function OAuthRedirectPage() {
  return (
    <Suspense fallback={<RedirectFallback />}>
      <OAuthRedirectContent />
    </Suspense>
  );
}
