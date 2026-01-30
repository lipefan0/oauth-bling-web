import { NextRequest, NextResponse } from "next/server";

const TOKEN_URL = "https://www.bling.com.br/Api/v3/oauth/token";
const DEFAULT_REDIRECT_URI =
  "https://oauth-bling-web.vercel.app/oauth/redirect";

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();

    if (!code || !state) {
      return NextResponse.json(
        { error: "code e state são obrigatórios." },
        { status: 400 },
      );
    }

    const storedState = request.cookies.get("bling_oauth_state")?.value;
    const storedCredentials = request.cookies.get("bling_oauth_client")?.value;

    if (!storedState || !storedCredentials) {
      return NextResponse.json(
        { error: "Sessão expirada. Inicie o fluxo novamente." },
        { status: 400 },
      );
    }

    if (storedState !== state) {
      return NextResponse.json({ error: "State inválido." }, { status: 400 });
    }

    let credentials: { clientId: string; clientSecret: string };

    try {
      credentials = JSON.parse(
        Buffer.from(storedCredentials, "base64").toString("utf8"),
      );
    } catch (error) {
      return NextResponse.json(
        { error: "Não foi possível recuperar as credenciais da sessão." },
        { status: 400 },
      );
    }

    if (!credentials?.clientId || !credentials?.clientSecret) {
      return NextResponse.json(
        { error: "Credenciais incompletas. Reinicie o fluxo." },
        { status: 400 },
      );
    }

    const authorizationHeader = `Basic ${Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`,
    ).toString("base64")}`;

    const redirectUri = process.env.BLING_REDIRECT_URI ?? DEFAULT_REDIRECT_URI;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "enable-jwt": "1",
      },
      body: body.toString(),
    });

    const contentType = tokenResponse.headers.get("content-type") ?? "";
    let payload: unknown;

    if (contentType.includes("application/json")) {
      payload = await tokenResponse.json();
    } else {
      const text = await tokenResponse.text();

      try {
        payload = JSON.parse(text);
      } catch (error) {
        payload = { raw: text };
      }
    }

    const response = NextResponse.json(payload, {
      status: tokenResponse.status,
    });

    response.cookies.delete("bling_oauth_state");
    response.cookies.delete("bling_oauth_client");

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao trocar o código pelo token.",
      },
      { status: 500 },
    );
  }
}
