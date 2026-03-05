import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2, LogIn, LogOut } from "lucide-react";
import type { AppPage } from "../App";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useListStructures } from "../hooks/useQueries";
import { overallConditionLevel } from "../utils/heritage";

interface NavbarProps {
  onNavigateHome: () => void;
  currentPage: AppPage;
}

export function Navbar({ onNavigateHome, currentPage }: NavbarProps) {
  const {
    login,
    clear,
    isLoggingIn,
    isLoginSuccess,
    identity,
    isInitializing,
  } = useInternetIdentity();

  const { data: structures } = useListStructures();
  const criticalCount = (structures ?? []).filter((s) => {
    const lvl = overallConditionLevel(s.currentCondition);
    return lvl === "critical" || lvl === "poor";
  }).length;

  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}…${principal.slice(-3)}`
    : null;

  return (
    <header className="stone-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid="nav.home_link"
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 group"
            aria-label="Heritage Monitor home"
          >
            <div className="relative w-7 h-7 flex-shrink-0">
              <div className="w-7 h-7 rounded-sm overflow-hidden bg-terracotta/20 flex items-center justify-center">
                <img
                  src="/assets/generated/heritage-logo-transparent.dim_80x80.png"
                  alt="Heritage Monitor"
                  className="w-5 h-5 object-contain"
                />
              </div>
              {criticalCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold font-mono flex items-center justify-center animate-pulse shadow-sm"
                  aria-label={`${criticalCount} structure${criticalCount !== 1 ? "s" : ""} need attention`}
                  title={`${criticalCount} structure${criticalCount !== 1 ? "s" : ""} in critical or poor condition`}
                >
                  {criticalCount > 9 ? "9+" : criticalCount}
                </span>
              )}
            </div>
            <span className="font-display text-lg font-semibold text-stone-100 tracking-tight group-hover:text-amber-300 transition-colors">
              Heritage Monitor
            </span>
          </button>

          {/* Breadcrumb */}
          {currentPage.page === "structure" && (
            <div className="hidden sm:flex items-center gap-1.5 text-stone-400 text-sm">
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-body truncate max-w-[200px]">
                Structure Detail
              </span>
            </div>
          )}
        </div>

        {/* Right: Auth */}
        <div className="flex items-center gap-3">
          {isInitializing ? (
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          ) : isLoginSuccess || !!identity ? (
            <div className="flex items-center gap-2">
              {shortPrincipal && (
                <span className="hidden sm:block text-xs text-stone-400 font-mono">
                  {shortPrincipal}
                </span>
              )}
              <Button
                data-ocid="nav.login_button"
                variant="ghost"
                size="sm"
                onClick={clear}
                className="text-stone-300 hover:text-white hover:bg-white/10 h-8 gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button
              data-ocid="nav.login_button"
              size="sm"
              onClick={login}
              disabled={isLoggingIn}
              className="bg-terracotta hover:bg-terracotta-dark text-white h-8 gap-1.5 border-0"
            >
              {isLoggingIn ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              <span>{isLoggingIn ? "Signing in…" : "Sign In"}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
