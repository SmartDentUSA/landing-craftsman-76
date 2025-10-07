import { useEffect } from "react";

export default function OAuthLaunch() {
  useEffect(() => {
    // 🔧 Adiciona meta Referrer-Policy para compatibilidade cross-origin
    const meta = document.createElement("meta");
    meta.httpEquiv = "Referrer-Policy";
    meta.content = "no-referrer-when-downgrade";
    document.head.appendChild(meta);

    try {
      const params = new URLSearchParams(window.location.search);
      const target = params.get("target");

      // 🔍 LOGS DE DIAGNÓSTICO
      console.log("🔍 Debug OAuth Launch", {
        inIframe: window.self !== window.top,
        currentOrigin: window.location.origin,
        targetPreview: target?.slice(0, 120),
        userAgent: navigator.userAgent,
        canOpenWindow: !!window.open
      });

      if (
        !target ||
        !/^https:\/\/accounts\.google\.com\/o\/oauth2\/(v2\/)?auth/.test(target)
      ) {
        console.error("🚫 URL alvo inválida ou insegura:", target);
        return;
      }

      console.log("🔁 Redirecionando para Google OAuth:", target);
      
      // ✅ USAR location.assign ao invés de window.open
      try {
        window.location.assign(target);
      } catch (err) {
        console.error("❌ window.location.assign falhou, fallback para replace", err);
        window.location.replace(target);
      }
    } catch (err) {
      console.error("❌ Erro ao redirecionar:", err);
    }

    // Cleanup ao desmontar componente
    return () => {
      if (document.head.contains(meta)) {
        document.head.removeChild(meta);
      }
    };
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
          if (target) window.open(target, "_self");
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
