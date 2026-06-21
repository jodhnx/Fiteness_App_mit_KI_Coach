/** Runs before paint — locks safe-area insets so layout does not jump after hydration. */
export function SafeAreaScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var r=document.documentElement,e=document.createElement("div");e.style.cssText="position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none";r.appendChild(e);var s=getComputedStyle(e),t=s.paddingTop||"0px",b=s.paddingBottom||"0px";r.style.setProperty("--safe-area-top",t);r.style.setProperty("--safe-area-bottom",b);r.removeChild(e);r.dataset.safeArea="ready";}catch(x){}})();`,
      }}
    />
  );
}
