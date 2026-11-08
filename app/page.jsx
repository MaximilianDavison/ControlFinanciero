"use client";
import { useEffect, useState } from "react";
import { createAuthClient } from "@neon/auth/next";
const client = createAuthClient();
const box = {
  maxWidth: 420,
  margin: "8vh auto",
  padding: 24,
  background: "white",
  borderRadius: 12,
};
export default function Home() {
  const [session, setSession] = useState(null),
    [pending, setPending] = useState(true),
    [message, setMessage] = useState(""),
    [signup, setSignup] = useState(false),
    [verifyEmail, setVerifyEmail] = useState("");
  async function refresh() {
    try {
      const r = await client.getSession();
      setSession(r.data);
      if (r.data?.user && !r.data.user.emailVerified)
        setVerifyEmail(r.data.user.email);
      if (r.error) setMessage(r.error.message);
    } catch {
      setMessage("No se pudo comprobar tu sesión.");
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setPending(true);
    const f = new FormData(e.currentTarget);
    try {
      const args = {
        email: f.get("email"),
        password: f.get("password"),
        name: f.get("name") || "Usuario",
      };
      const r = signup
        ? await client.signUp.email(args)
        : await client.signIn.email(args);
      if (r.error) {
        if (r.error.code === "EMAIL_NOT_VERIFIED") setVerifyEmail(args.email);
        throw Error(r.error.message);
      }
      if (r.data?.user && !r.data.user.emailVerified) {
        setVerifyEmail(args.email);
        setMessage("Revisa tu correo e introduce el código de verificación.");
        return;
      }
      await refresh();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setPending(false);
    }
  }
  async function verify(e) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const r = await client.emailOtp.verifyEmail({
        email: verifyEmail,
        otp: new FormData(e.currentTarget).get("otp"),
      });
      if (r.error) throw Error(r.error.message);
      setVerifyEmail("");
      setSignup(false);
      await refresh();
      setMessage(
        "Correo verificado. Si no se abrió el tablero, inicia sesión.",
      );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setPending(false);
    }
  }
  async function resend() {
    setPending(true);
    try {
      const r = await client.emailOtp.sendVerificationOtp({
        email: verifyEmail,
        type: "email-verification",
      });
      if (r.error) throw Error(r.error.message);
      setMessage("Código enviado. Revisa también la carpeta de spam.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setPending(false);
    }
  }
  async function logout() {
    try {
      const r = await client.signOut();
      if (r.error) throw Error(r.error.message);
      setSession(null);
    } catch (e) {
      setMessage(e.message);
    }
  }
  if (pending) return <p style={{ padding: 24 }}>Conectando…</p>;
  if (verifyEmail)
    return (
      <main style={box}>
        <h1>Verificar correo</h1>
        <p>Introduce el código enviado a {verifyEmail}.</p>
        <form onSubmit={verify} style={{ display: "grid", gap: 12 }}>
          <input
            name="otp"
            placeholder="Código de verificación"
            autoComplete="one-time-code"
            inputMode="numeric"
            required
          />
          <button>Verificar</button>
        </form>
        <p role="status">{message}</p>
        <button onClick={resend}>Reenviar código</button>{" "}
        <button onClick={() => setVerifyEmail("")}>Volver al inicio</button>
      </main>
    );
  if (session?.user?.emailVerified)
    return (
      <>
        <header
          style={{
            padding: 10,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{session.user.email}</span>
          <button onClick={logout}>Cerrar sesión</button>
        </header>
        {message && <p role="status">{message}</p>}
        <iframe
          title="Tablero financiero"
          src="/tablero.html"
          style={{ width: "100%", height: "calc(100vh - 55px)", border: 0 }}
        />
      </>
    );
  return (
    <main style={box}>
      <h1>Control financiero</h1>
      <p>Accede para registrar tus movimientos en Neon.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        {signup && <input name="name" placeholder="Nombre" required />}
        <input
          name="email"
          type="email"
          placeholder="Correo"
          autoComplete="username"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          minLength={8}
          autoComplete={signup ? "new-password" : "current-password"}
          required
        />
        <button>{signup ? "Crear cuenta" : "Entrar"}</button>
      </form>
      <p role="alert">{message}</p>
      <button onClick={() => setSignup(!signup)}>
        {signup ? "Ya tengo cuenta" : "Crear mi cuenta"}
      </button>
    </main>
  );
}
