import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const AUTHORIZE_URL = "https://bling.com.br/Api/v3/oauth/authorize";
const DEFAULT_REDIRECT_URI = "http://oauth-bling-web.vercel.app/oauth/redirect";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 300,
};

export async function POST(request: NextRequest) {
  try {
    const { clientId, clientSecret } = await request.json();

    const trimmedClientId = typeof clientId === "string" ? clientId.trim() : "";
    const trimmedClientSecret =
      typeof clientSecret === "string" ? clientSecret.trim() : "";

    if (!trimmedClientId || !trimmedClientSecret) {
      return NextResponse.json(
        { error: "clientId e clientSecret são obrigatórios." },
        { status: 400 }
      );
    }

    const state = randomBytes(16).toString("hex");
    const redirectUri = process.env.BLING_REDIRECT_URI ?? DEFAULT_REDIRECT_URI;

    const authorizeUrl = `${AUTHORIZE_URL}?${new URLSearchParams({
      response_type: "code",
      client_id: trimmedClientId,
      state,
      redirect_uri: redirectUri,
    }).toString()}`;

    const payload = Buffer.from(
      JSON.stringify({
        clientId: trimmedClientId,
        clientSecret: trimmedClientSecret,
      })
    ).toString("base64");

    const response = NextResponse.json({ authorizeUrl });

    response.cookies.set({
      name: "bling_oauth_state",
      value: state,
      ...cookieOptions,
    });

    response.cookies.set({
      name: "bling_oauth_client",
      value: payload,
      ...cookieOptions,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar o fluxo de autorização.",
      },
      { status: 500 }
    );
  }
}
