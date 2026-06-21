/** Runs before paint — locks safe-area insets so layout does not jump after hydration. */
export function SafeAreaScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var e=document.createElement("div");e.style.cssText="position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none";document.documentElement.appendChild(e);var s=getComputedStyle(e);document.documentElement.style.setProperty("--safe-area-top",s.paddingTop);document.documentElement.style.setProperty("--safe-area-bottom",s.paddingBottom);document.documentElement.removeChild(e);}catch(x){}})();`,
      }}
    />
  );
}
