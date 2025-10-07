import { useEffect } from "react";

export default function OAuthLaunch() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const target = params.get("target");

      if (
        !target ||
        !/^https:\/\/accounts\.google\.com\/o\/oauth2\/(v2\/)?auth/.test(target)
      ) {
        console.error("🚫 URL alvo inválida ou insegura:", target);
        return;
      }

      console.log("🔁 Redirecionando para Google OAuth:", target);
      setTimeout(() => window.location.replace(target), 100);
    } catch (err) {
      console.error("❌ Erro ao redirecionar:", err);
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      <h2>Redirecionando para o Google...</h2>
      <p>Se não acontecer automaticamente, clique abaixo:</p>
      <button
        onClick={() => {
          const target = new URLSearchParams(window.location.search).get("target");
          if (target) window.location.href = target;
        }}
        style={{
          padding: "10px 20px",
          backgroundColor: "#4285F4",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          marginTop: "12px",
        }}
      >
        Prosseguir Manualmente
      </button>
    </div>
  );
}
