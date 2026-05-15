"use client";

import { useState } from "react";
import { Brain, Sparkles, Medal, Loader2 } from "lucide-react";
import { login, register } from "./actions";
import toast from "react-hot-toast";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      toast.error("Todos los campos principales son obligatorios.");
      return false;
    }
    if (!formData.email.includes("@")) {
      toast.error("Ingresa un correo válido.");
      return false;
    }
    if (formData.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return false;
    }
    if (!isLogin) {
      if (!formData.nombre) {
        toast.error("El nombre completo es obligatorio.");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Las contraseñas no coinciden.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const data = new FormData();
    data.append("email", formData.email);
    data.append("password", formData.password);
    if (!isLogin) data.append("nombre", formData.nombre);

    if (isLogin) {
      const res = await login(data);
      if (res?.error) {
        let msg = "Error al iniciar sesión.";
        if (res.error.includes("Invalid login credentials")) msg = "Credenciales incorrectas.";
        toast.error(msg);
      } else {
        toast.success("¡Bienvenido de vuelta!");
      }
    } else {
      const res = await register(data);
      if (res?.error) {
        let msg = "Error al registrarse.";
        if (res.error.includes("already registered")) msg = "Este correo ya está registrado.";
        toast.error(msg);
      } else if (res?.success) {
        toast.success("Revisa tu email para confirmar tu cuenta.");
        setIsLogin(true);
        setFormData({ ...formData, password: "", confirmPassword: "" });
      }
    }
    setIsLoading(false);
  };

  return (
    <main className="flex h-screen w-full font-sans bg-background text-on-surface">
      {/* Lado Izquierdo - Branding */}
      <section className="hidden lg:flex w-1/2 bg-white flex-col justify-center px-16 relative border-r border-outline-variant/30">
        <div className="max-w-md relative z-10">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="font-bold text-4xl tracking-tight">FOCO</span>
            <span className="font-bold text-4xl text-primary">I</span>
          </div>
          <p className="text-xl text-on-surface-variant mb-12 font-medium">Para los que van en serio</p>
          
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-xl bg-primary-container/30 flex items-center justify-center text-primary">
                <Brain size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Productividad psicológica</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Diseñado para alinearse con tus ritmos cognitivos naturales y reducir la carga mental.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-xl bg-secondary-container/30 flex items-center justify-center text-secondary">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Estudio profundo sin ruido</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Elimina las distracciones digitales y entra en estado de flow con el Asistente Lumos AI.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                <Medal size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Gamificación académica</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Convierte tu disciplina en progreso tangible, rachas y recompensas de experiencia (XP).
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative subtle background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-container rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-soft"></div>
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-secondary-container rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        </div>
      </section>

      {/* Lado Derecho - Formulario */}
      <section className="w-full lg:w-1/2 bg-surface flex items-center justify-center px-6 relative">
        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-sm p-8 border border-outline-variant/50 animate-slide-up relative z-10">
          
          {/* Logo Mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-3xl tracking-tight">FOCO</span>
              <span className="font-bold text-3xl text-primary">I</span>
            </div>
          </div>

          {/* Toggle Tabs */}
          <div className="flex border-b border-outline-variant/50 mb-8 relative">
            <div 
              className={`absolute bottom-[-1px] h-0.5 bg-primary transition-all duration-300 ease-in-out w-1/2 ${isLogin ? 'left-0' : 'left-1/2'}`}
            ></div>
            <button
              onClick={() => setIsLogin(true)}
              type="button"
              className={`flex-1 pb-3 text-sm font-semibold tracking-wide uppercase transition-colors ${
                isLogin ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              type="button"
              className={`flex-1 pb-3 text-sm font-semibold tracking-wide uppercase transition-colors ${
                !isLogin ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Formulario */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant" htmlFor="nombre">
                  Nombre Completo
                </label>
                <input
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline/50"
                  id="nombre"
                  name="nombre"
                  placeholder="Tu nombre real"
                  type="text"
                  value={formData.nombre}
                  onChange={handleChange}
                />
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant" htmlFor="email">
                Email
              </label>
              <input
                className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline/50"
                id="email"
                name="email"
                placeholder="estudiante@focoi.edu"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant" htmlFor="password">
                  Contraseña
                </label>
                {isLogin && (
                  <a className="text-xs font-medium text-primary hover:opacity-80 hover:underline transition-colors" href="#">
                    ¿Olvidaste tu contraseña?
                  </a>
                )}
              </div>
              <input
                className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline/50"
                id="password"
                name="password"
                placeholder="••••••••"
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {!isLogin && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant" htmlFor="confirmPassword">
                  Confirmar Contraseña
                </label>
                <input
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline/50"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="••••••••"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            )}

            <button
              disabled={isLoading}
              className="w-full h-12 bg-primary text-white font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center mt-2 shadow-sm shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isLogin ? (
                "Entrar"
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
