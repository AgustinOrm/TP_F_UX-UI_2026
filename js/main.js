/* ==========================================================================
   Portfolio UX/UI — Interacciones (vanilla JS)
   - Toggle de tema claro/oscuro (persistente)
   - Menú móvil accesible (aria-expanded / aria-controls)
   - Validación de formulario
   - Observer de sección activa
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- TEMA ---------- */
  const THEME_KEY = "portfolio-theme";
  const root = document.documentElement;

  function getInitialTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);

    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      const label = btn.querySelector("[data-theme-label]");
      const icon = btn.querySelector("[data-theme-icon]");
      if (theme === "dark") {
        btn.setAttribute("aria-label", "Cambiar a modo claro");
        if (label) label.textContent = "Oscuro";
        if (icon) icon.textContent = "◐";
      } else {
        btn.setAttribute("aria-label", "Cambiar a modo oscuro");
        if (label) label.textContent = "Claro";
        if (icon) icon.textContent = "☼";
      }
    });
  }

  applyTheme(getInitialTheme());

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  });

  /* ---------- MENÚ MÓVIL ---------- */
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.getElementById("menu-movil");

  if (menuToggle && mobileMenu) {
    const icon = menuToggle.querySelector("[data-menu-icon]");
    const close = () => {
      mobileMenu.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menú");
      if (icon) icon.textContent = "☰";
    };
    const open = () => {
      mobileMenu.hidden = false;
      menuToggle.setAttribute("aria-expanded", "true");
      menuToggle.setAttribute("aria-label", "Cerrar menú");
      if (icon) icon.textContent = "×";
    };

    menuToggle.addEventListener("click", () => {
      if (mobileMenu.hidden) open();
      else close();
    });

    // Cerrar al clickear un link del menú
    mobileMenu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", close)
    );

    // Cerrar con Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !mobileMenu.hidden) {
        close();
        menuToggle.focus();
      }
    });

    // Cerrar si se agranda a desktop
    const mq = window.matchMedia("(min-width: 1200px)");
    mq.addEventListener("change", (e) => {
      if (e.matches) close();
    });
  }

  /* ---------- OBSERVER DE SECCIÓN ACTIVA ---------- */
  const sections = Array.from(
    document.querySelectorAll("main section[id]")
  );
  if (sections.length > 0 && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            document
              .querySelectorAll(".navlink[data-section]")
              .forEach((a) => {
                const match = a.getAttribute("data-section") === id;
                if (match) a.setAttribute("aria-current", "true");
                else a.removeAttribute("aria-current");
              });
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- FORMULARIO ---------- */
  const form = document.querySelector("[data-contact-form]");
  if (form) {
    const statusBox = form.querySelector("[data-form-status]");
    const fields = ["nombre", "email", "mensaje"];

    const getError = (name, value) => {
      if (!value.trim()) {
        if (name === "nombre") return "Error: completá tu nombre.";
        if (name === "email") return "Error: completá tu email.";
        return "Error: completá el mensaje.";
      }
      if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Error: ingresá un email válido.";
      }
      return "";
    };

    const showFieldError = (input, message) => {
      const id = input.getAttribute("id");
      const errorEl = document.getElementById(`${id}-error`);
      if (!errorEl) return;
      if (message) {
        errorEl.textContent = message;
        errorEl.hidden = false;
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", `${id}-error`);
      } else {
        errorEl.hidden = true;
        errorEl.textContent = "";
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    };

    fields.forEach((name) => {
      const input = form.elements.namedItem(name);
      if (!input) return;
      input.addEventListener("blur", () => {
        showFieldError(input, getError(name, input.value));
      });
      input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") {
          showFieldError(input, getError(name, input.value));
        }
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let firstInvalid = null;
      
      // 1. Validar campos
      fields.forEach((name) => {
        const input = form.elements.namedItem(name);
        if (!input) return;
        const err = getError(name, input.value);
        showFieldError(input, err);
        if (err && !firstInvalid) firstInvalid = input;
      });

      if (statusBox) statusBox.innerHTML = "";

      if (firstInvalid) {
        if (statusBox) {
          statusBox.innerHTML =
            '<p class="alert alert-err"><span aria-hidden="true">!</span> Error. Revisá los campos indicados.</p>';
        }
        firstInvalid.focus();
        return;
      }

      // 2. Enviar datos a Formspree
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      
      // Estado de carga
      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando...";

      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: form.method,
          body: formData,
          headers: {
            'Accept': 'application/json' // Requerido por Formspree para devolver JSON
          }
        });

        if (response.ok) {
          // Éxito
          if (statusBox) {
            statusBox.innerHTML =
              '<p class="alert alert-ok"><span aria-hidden="true">✓</span> Enviado. Tu mensaje se recibió.</p>';
          }
          form.reset(); // Limpia los campos
          
          // Remover bordes rojos de error si quedaron
          fields.forEach((name) => {
            const input = form.elements.namedItem(name);
            if (input) {
              input.removeAttribute("aria-invalid");
              input.removeAttribute("aria-describedby");
            }
          });
        } else {
          throw new Error("Error en el servidor");
        }
      } catch (error) {
        // Error de red o de Formspree
        if (statusBox) {
          statusBox.innerHTML =
            '<p class="alert alert-err"><span aria-hidden="true">!</span> Hubo un problema al enviar. Por favor, intentá de nuevo o escribime por email.</p>';
        }
      } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
})();